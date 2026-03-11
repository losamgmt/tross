/**
 * RLS Filter Test Scenarios
 *
 * Pure functions testing row-level security DATA FILTERING.
 * These test that roles see only the rows they're authorized to see,
 * not just that unauthorized roles are denied.
 *
 * PRINCIPLE: RLS filters query results, not just access. A customer
 * calling GET /work_orders should see ONLY their work orders.
 */

const permissions = require("../../../../config/permissions.json");
const { getForeignKeyFieldNames } = require("../../../config/fk-helpers");
const { linkUserToCustomerProfile } = require("../../helpers/test-db");

/**
 * Get the RLS policy for a role on a resource
 */
function getRlsPolicy(resourceName, role) {
  const resource = permissions.resources[resourceName];
  return resource?.rowLevelSecurity?.[role];
}

/**
 * Check if entity supports customer-owned filtering
 * (has customer_id or similar FK that links to a customer)
 */
function hasCustomerOwnership(meta) {
  const fkFieldNames = getForeignKeyFieldNames(meta);
  if (fkFieldNames.size === 0) return false;

  return [...fkFieldNames].some(
    (fk) => fk === "customer_id" || fk.endsWith("_customer_id"),
  );
}

/**
 * Check if entity supports technician assignment filtering
 */
function hasTechnicianAssignment(meta) {
  const fkFieldNames = getForeignKeyFieldNames(meta);
  if (fkFieldNames.size === 0) return false;

  return [...fkFieldNames].some(
    (fk) => fk === "assigned_technician_id" || fk.includes("technician"),
  );
}

/**
 * Scenario: Customer sees only their own work orders
 *
 * Preconditions:
 * - Entity is work_orders
 * - RLS policy is own_work_orders_only for customer
 * Tests: Customer listing only shows their work orders
 */
function customerSeesOnlyOwnWorkOrders(meta, ctx) {
  if (meta.entityName !== "work_order") return;

  const policy = getRlsPolicy("work_orders", "customer");
  if (policy !== "own_work_orders_only") return;

  ctx.it(
    `GET /api/${meta.tableName} - customer sees only their own work orders`,
    async () => {
      // Get customer user
      const customerResult = await ctx.authHeader("customer");
      const customerUser = await ctx.getTestUser("customer");

      // Create a customer profile for this user
      const customerProfile = await ctx.factory.create("customer", {
        email: `rlstest_${Date.now()}@example.com`,
      });

      // Create work order owned by this customer
      const ownWorkOrder = await ctx.factory.create("work_order", {
        customer_id: customerProfile.id,
      });

      // Create work order owned by another customer
      const otherCustomer = await ctx.factory.create("customer", {
        email: `other_${Date.now()}@example.com`,
      });
      const otherWorkOrder = await ctx.factory.create("work_order", {
        customer_id: otherCustomer.id,
      });

      // Customer requests work orders
      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .set(customerResult)
        .query({ limit: 100 });

      // Should succeed
      ctx.expect(response.status).toBe(200);
      const items = response.body.data || response.body;

      // Should NOT contain the other customer's work order
      const foundOther = items.find((wo) => wo.id === otherWorkOrder.id);
      ctx.expect(foundOther).toBeUndefined();
    },
  );
}

/**
 * Scenario: Technician sees only assigned work orders
 *
 * Preconditions:
 * - Entity is work_orders
 * - RLS policy is assigned_work_orders_only for technician
 * Tests: Technician listing only shows assigned work orders
 */
function technicianSeesOnlyAssignedWorkOrders(meta, ctx) {
  if (meta.entityName !== "work_order") return;

  const policy = getRlsPolicy("work_orders", "technician");
  if (policy !== "assigned_work_orders_only") return;

  ctx.it(
    `GET /api/${meta.tableName} - technician sees only assigned work orders`,
    async () => {
      // Get technician user
      const techAuth = await ctx.authHeader("technician");
      const techUser = await ctx.getTestUser("technician");

      // Create a technician profile
      const techProfile = await ctx.factory.create("technician", {
        email: `techtest_${Date.now()}@example.com`,
      });

      // Create customer for work orders
      const customer = await ctx.factory.create("customer");

      // Create work order assigned to this technician
      const assignedWorkOrder = await ctx.factory.create("work_order", {
        customer_id: customer.id,
        assigned_technician_id: techProfile.id,
      });

      // Create work order assigned to different technician
      const otherTech = await ctx.factory.create("technician", {
        email: `othertech_${Date.now()}@example.com`,
      });
      const unassignedWorkOrder = await ctx.factory.create("work_order", {
        customer_id: customer.id,
        assigned_technician_id: otherTech.id,
      });

      // Technician requests work orders
      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .set(techAuth)
        .query({ limit: 100 });

      ctx.expect(response.status).toBe(200);
      const items = response.body.data || response.body;

      // Should NOT contain work order assigned to other technician
      const foundOther = items.find((wo) => wo.id === unassignedWorkOrder.id);
      ctx.expect(foundOther).toBeUndefined();
    },
  );
}

/**
 * Scenario: Customer sees only their own invoices
 *
 * Preconditions:
 * - Entity is invoices
 * - RLS policy is own_invoices_only for customer
 */
function customerSeesOnlyOwnInvoices(meta, ctx) {
  if (meta.entityName !== "invoice") return;

  const policy = getRlsPolicy("invoices", "customer");
  if (policy !== "own_invoices_only") return;

  ctx.it(
    `GET /api/${meta.tableName} - customer sees only their own invoices`,
    async () => {
      const customerAuth = await ctx.authHeader("customer");

      // Create two customers
      const myCustomer = await ctx.factory.create("customer");
      const otherCustomer = await ctx.factory.create("customer");

      // Create invoice for "my" customer
      const myInvoice = await ctx.factory.create("invoice", {
        customer_id: myCustomer.id,
      });

      // Create invoice for other customer
      const otherInvoice = await ctx.factory.create("invoice", {
        customer_id: otherCustomer.id,
      });

      // Request invoices
      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .set(customerAuth)
        .query({ limit: 100 });

      ctx.expect(response.status).toBe(200);
      const items = response.body.data || response.body;

      // Other customer's invoice should not be visible
      const foundOther = items.find((inv) => inv.id === otherInvoice.id);
      ctx.expect(foundOther).toBeUndefined();
    },
  );
}

/**
 * Scenario: Admin sees all records regardless of ownership
 *
 * Preconditions: Entity has RLS configured
 * Tests: Admin listing includes all records
 */
function adminSeesAllRecords(meta, ctx) {
  const { rlsResource, tableName, entityName } = meta;
  if (!rlsResource) return;

  const policy = getRlsPolicy(rlsResource, "admin");
  if (policy !== "all_records") return;

  ctx.it(`GET /api/${tableName} - admin sees all records`, async () => {
    const adminAuth = await ctx.authHeader("admin");

    // Create multiple entities
    const entity1 = await ctx.factory.create(entityName);
    const entity2 = await ctx.factory.create(entityName);

    const response = await ctx.request
      .get(`/api/${tableName}`)
      .set(adminAuth)
      .query({ limit: 100 });

    ctx.expect(response.status).toBe(200);
    const items = response.body.data || response.body;

    // Both should be visible
    const found1 = items.find((e) => e.id === entity1.id);
    const found2 = items.find((e) => e.id === entity2.id);
    ctx.expect(found1).toBeDefined();
    ctx.expect(found2).toBeDefined();
  });
}

/**
 * Scenario: Customer sees only units linked via junction table
 *
 * Preconditions:
 * - Entity is unit
 * - RLS rule has junction type for customer
 * Tests: Customer listing only shows units linked via customer_units
 */
function customerSeesOnlyLinkedUnits(meta, ctx) {
  if (meta.entityName !== "unit") return;

  // Check for junction RLS rule
  const hasJunctionRls = meta.rlsRules?.some(
    (rule) =>
      rule.roles === "customer" &&
      rule.access?.type === "junction" &&
      rule.access?.junction?.table === "customer_units"
  );
  if (!hasJunctionRls) return;

  ctx.it(
    `GET /api/${meta.tableName} - customer sees only units linked via junction`,
    async () => {
      // Create two customer profiles
      const customerProfile = await ctx.factory.create("customer", {
        email: `junction_test_${Date.now()}@example.com`,
      });
      const otherCustomerProfile = await ctx.factory.create("customer", {
        email: `junction_other_${Date.now()}@example.com`,
      });

      // Create two units (factory auto-resolves property FK)
      const linkedUnit = await ctx.factory.create("unit");
      const unlinkedUnit = await ctx.factory.create("unit");

      // Link customer to one unit via junction table
      await ctx.factory.create("customer_unit", {
        customer_id: customerProfile.id,
        unit_id: linkedUnit.id,
      });

      // Link the other unit to a different customer
      await ctx.factory.create("customer_unit", {
        customer_id: otherCustomerProfile.id,
        unit_id: unlinkedUnit.id,
      });

      // Create a fresh user and link to customer profile
      const { createTestUser } = require("../../helpers/test-db");
      const { user, token } = await createTestUser({ role: "customer" });
      await linkUserToCustomerProfile(user.id, customerProfile.id);

      // Customer requests units
      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .set({ Authorization: `Bearer ${token}` })
        .query({ limit: 100 });

      ctx.expect(response.status).toBe(200);
      const items = response.body.data || response.body;

      // Should contain the linked unit
      const foundLinked = items.find((u) => u.id === linkedUnit.id);
      ctx.expect(foundLinked).toBeDefined();

      // Should NOT contain the unlinked unit
      const foundUnlinked = items.find((u) => u.id === unlinkedUnit.id);
      ctx.expect(foundUnlinked).toBeUndefined();
    }
  );
}

/**
 * Scenario: Customer sees only assets in units linked via junction
 *
 * Preconditions:
 * - Entity is asset
 * - RLS rule has parent type referencing unit (which has junction RLS)
 * Tests: Multi-hop RLS - customer sees assets only in their linked units
 */
function customerSeesOnlyAssetsInLinkedUnits(meta, ctx) {
  if (meta.entityName !== "asset") return;

  // Check for parent RLS rule referencing unit
  const hasParentRls = meta.rlsRules?.some(
    (rule) =>
      rule.roles === "customer" &&
      rule.access?.type === "parent" &&
      rule.access?.parentEntity === "unit"
  );
  if (!hasParentRls) return;

  ctx.it(
    `GET /api/${meta.tableName} - customer sees only assets in linked units (multi-hop RLS)`,
    async () => {
      // Create customer profile
      const customerProfile = await ctx.factory.create("customer", {
        email: `asset_test_${Date.now()}@example.com`,
      });
      const otherCustomerProfile = await ctx.factory.create("customer", {
        email: `asset_other_${Date.now()}@example.com`,
      });

      // Create two units (factory auto-resolves property FK)
      const linkedUnit = await ctx.factory.create("unit");
      const unlinkedUnit = await ctx.factory.create("unit");

      // Link customer to one unit via junction table
      await ctx.factory.create("customer_unit", {
        customer_id: customerProfile.id,
        unit_id: linkedUnit.id,
      });

      // Link the other unit to a different customer
      await ctx.factory.create("customer_unit", {
        customer_id: otherCustomerProfile.id,
        unit_id: unlinkedUnit.id,
      });

      // Create assets in both units
      const linkedAsset = await ctx.factory.create("asset", {
        unit_id: linkedUnit.id,
      });
      const unlinkedAsset = await ctx.factory.create("asset", {
        unit_id: unlinkedUnit.id,
      });

      // Create fresh user and link to customer profile
      const { createTestUser } = require("../../helpers/test-db");
      const { user, token } = await createTestUser({ role: "customer" });
      await linkUserToCustomerProfile(user.id, customerProfile.id);

      // Customer requests assets
      const response = await ctx.request
        .get(`/api/${meta.tableName}`)
        .set({ Authorization: `Bearer ${token}` })
        .query({ limit: 100 });

      ctx.expect(response.status).toBe(200);
      const items = response.body.data || response.body;

      // Should contain asset from linked unit
      const foundLinked = items.find((a) => a.id === linkedAsset.id);
      ctx.expect(foundLinked).toBeDefined();

      // Should NOT contain asset from unlinked unit
      const foundUnlinked = items.find((a) => a.id === unlinkedAsset.id);
      ctx.expect(foundUnlinked).toBeUndefined();
    }
  );
}

module.exports = {
  customerSeesOnlyOwnWorkOrders,
  technicianSeesOnlyAssignedWorkOrders,
  customerSeesOnlyOwnInvoices,
  adminSeesAllRecords,
  customerSeesOnlyLinkedUnits,
  customerSeesOnlyAssetsInLinkedUnits,
};
