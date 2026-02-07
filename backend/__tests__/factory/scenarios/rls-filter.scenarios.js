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
  const { foreignKeys } = meta;
  if (!foreignKeys) return false;

  return Object.keys(foreignKeys).some(
    (fk) => fk === "customer_id" || fk.endsWith("_customer_id"),
  );
}

/**
 * Check if entity supports technician assignment filtering
 */
function hasTechnicianAssignment(meta) {
  const { foreignKeys } = meta;
  if (!foreignKeys) return false;

  return Object.keys(foreignKeys).some(
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

module.exports = {
  customerSeesOnlyOwnWorkOrders,
  technicianSeesOnlyAssignedWorkOrders,
  customerSeesOnlyOwnInvoices,
  adminSeesAllRecords,
};
