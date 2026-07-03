/**
 * Hook Wiring Integration Tests — Approval Workflow
 *
 * The hook ENGINE is unit-tested in isolation (hook-service.test.js) and the
 * service's handling of a requiresApproval result is unit-tested with mocks.
 * These tests close the remaining gap: that the metadata-defined field hooks are
 * actually WIRED end-to-end through the real engine, service, route, and DB.
 *
 * Target hook (invoice.status, beforeChange):
 *   when total > 5000 → requiresApproval { approver: 'manager' }
 * plus the no-approval path (low value) and the skipHooks bypass.
 */

const request = require("supertest");
const app = require("../../server");
const { createTestUser, cleanupTestDatabase } = require("../helpers/test-db");
const { getUniqueValues } = require("../helpers/test-helpers");
const GenericEntityService = require("../../services/entity/generic-entity-service");
const db = require("../../db/connection");

const HIGH_VALUE = 6000; // > 5000 approval threshold
const LOW_VALUE = 100; // < 5000 threshold

describe("Hook wiring — invoice high-value approval workflow", () => {
  let adminToken;
  let customerId;

  beforeAll(async () => {
    const admin = await createTestUser("admin");
    adminToken = admin.token;

    const unique = getUniqueValues();
    const customer = await GenericEntityService.create("customer", {
      first_name: `HookTest${unique.suffix}`,
      last_name: "Customer",
      email: unique.email,
      phone: unique.phone,
    });
    customerId = customer.id;
  });

  afterAll(async () => {
    if (customerId) {
      try {
        await db.query("DELETE FROM invoices WHERE customer_id = $1", [
          customerId,
        ]);
        await GenericEntityService.delete("customer", customerId);
      } catch {
        // ignore cleanup errors
      }
    }
    await cleanupTestDatabase();
  });

  /**
   * Create a draft invoice at a given total. Create runs afterChange hooks only,
   * and the status beforeChange hook fires on a status CHANGE — so a freshly
   * created draft never trips the approval hook. invoice_number auto-generates.
   */
  async function createDraftInvoice(total) {
    return GenericEntityService.create("invoice", {
      customer_id: customerId,
      amount: total,
      total,
      status: "draft",
    });
  }

  test("high-value status change requires manager approval (202 + approvalInfo)", async () => {
    const invoice = await createDraftInvoice(HIGH_VALUE);

    const response = await request(app)
      .patch(`/api/invoices/${invoice.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "sent" });

    expect(response.status).toBe(202);
    expect(response.body.code).toBe("APPROVAL_REQUIRED");
    expect(response.body.details.approvalInfo).toEqual(
      expect.objectContaining({
        approver: "manager",
        targetEntity: "invoice",
        targetField: "status",
        proposedValue: "sent",
      }),
    );

    // beforeChange blocks PRE-write: the status must not have persisted.
    const after = await GenericEntityService.findById("invoice", invoice.id);
    expect(after.status).toBe("draft");
  });

  test("low-value status change is allowed (approval hook does not match)", async () => {
    const invoice = await createDraftInvoice(LOW_VALUE);

    const response = await request(app)
      .patch(`/api/invoices/${invoice.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "sent" });

    expect(response.status).toBe(200);
    const data = response.body.data || response.body;
    expect(data.status).toBe("sent");
  });

  test("skipHooks bypasses the approval hook", async () => {
    const invoice = await createDraftInvoice(HIGH_VALUE);

    // Same high-value change that returned 202 above, but skipHooks must bypass
    // beforeChange entirely so the update proceeds.
    const updated = await GenericEntityService.update(
      "invoice",
      invoice.id,
      { status: "sent" },
      { skipHooks: true },
    );

    expect(updated.status).toBe("sent");
  });
});
