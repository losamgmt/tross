/**
 * Audit Logging Test Scenarios
 *
 * Pure functions testing that CRUD operations generate proper audit logs.
 * Driven by metadata.auditEnabled flag.
 *
 * PRINCIPLE: If an entity has auditing enabled, all state-changing
 * operations should generate audit log entries.
 */

const db = require("../../../db/connection");
const { getCapabilities } = require("./scenario-helpers");

/**
 * Check if entity has auditing enabled
 */
function isAuditEnabled(meta) {
  // Check explicit flag or default to enabled for business entities
  if (meta.auditEnabled === false) return false;
  if (meta.auditEnabled === true) return true;

  // Default: enabled for all business entities (has fieldAccess)
  return !!meta.fieldAccess;
}

/**
 * Poll audit_logs for a matching entry. Audit logs are written POST-COMMIT
 * (async, non-blocking), so a fixed sleep is racy under load - retry until the
 * row appears or the timeout elapses.
 *
 * @returns {Promise<Array>} matching rows (empty if none within timeout)
 */
async function waitForAuditLog(
  ctx,
  { resourceType, resourceId, actionLike, since },
  timeoutMs = 2000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await ctx.db.query(
      `SELECT * FROM audit_logs
       WHERE resource_type = $1
       AND resource_id = $2
       AND action LIKE $3
       AND created_at >= $4
       ORDER BY created_at DESC
       LIMIT 1`,
      [resourceType, resourceId, actionLike, since],
    );
    if (result.rows.length > 0 || Date.now() >= deadline) {
      return result.rows;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Scenario: CREATE generates audit log entry
 *
 * Preconditions: Entity has auditing enabled AND API create is not disabled
 * Tests: POST creates an audit_logs entry with action=create
 */
function createGeneratesAuditLog(meta, ctx) {
  const caps = getCapabilities(meta);
  if (!isAuditEnabled(meta)) return;
  if (!caps.canCreate) return; // Create disabled = scenario N/A

  ctx.it(
    `POST /api/${meta.tableName} - generates audit log entry`,
    async () => {
      const beforeCreate = new Date();
      const auth = await ctx.authHeader("admin");
      const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);

      const response = await ctx.request
        .post(`/api/${meta.tableName}`)
        .set(auth)
        .send(payload);

      ctx.expect(response.status).toBe(201);
      const created = response.body.data || response.body;

      // Poll for the async (post-commit) audit log
      const auditRows = await waitForAuditLog(ctx, {
        resourceType: meta.entityName,
        resourceId: created.id,
        actionLike: "%create%",
        since: beforeCreate,
      });

      ctx.expect(auditRows.length).toBeGreaterThan(0);
      const auditLog = auditRows[0];
      ctx.expect(auditLog.result).toBe("success");
    },
  );
}

/**
 * Scenario: UPDATE generates audit log entry with old/new values
 *
 * Preconditions: Entity has auditing enabled and mutable fields
 * Tests: PATCH creates an audit_logs entry with action=update
 */
function updateGeneratesAuditLog(meta, ctx) {
  if (!isAuditEnabled(meta)) return;

  // Find a mutable field
  const mutableFields = Object.keys(meta.fieldAccess || {}).filter((field) => {
    if (["id", "created_at"].includes(field)) return false;
    if (meta.immutableFields?.includes(field)) return false;
    const access = meta.fieldAccess[field];
    return access?.update && access.update !== "none";
  });

  if (!mutableFields.length) return;

  ctx.it(
    `PATCH /api/${meta.tableName}/:id - generates audit log with changes`,
    async () => {
      const created = await ctx.factory.create(meta.entityName);
      const beforeUpdate = new Date();
      const auth = await ctx.authHeader("admin");

      const fieldToUpdate = mutableFields[0];
      const newValue = ctx.factory.generateFieldValue(
        meta.entityName,
        fieldToUpdate,
      );

      const response = await ctx.request
        .patch(`/api/${meta.tableName}/${created.id}`)
        .set(auth)
        .send({ [fieldToUpdate]: newValue });

      ctx.expect(response.status).toBe(200);

      // Poll for the async (post-commit) audit log
      const auditRows = await waitForAuditLog(ctx, {
        resourceType: meta.entityName,
        resourceId: created.id,
        actionLike: "%update%",
        since: beforeUpdate,
      });

      ctx.expect(auditRows.length).toBeGreaterThan(0);
      const auditLog = auditRows[0];
      ctx.expect(auditLog.result).toBe("success");
    },
  );
}

/**
 * Scenario: DELETE generates audit log entry
 *
 * Preconditions: Entity has auditing enabled
 * Tests: DELETE creates an audit_logs entry with action=delete
 */
function deleteGeneratesAuditLog(meta, ctx) {
  if (!isAuditEnabled(meta)) return;

  ctx.it(
    `DELETE /api/${meta.tableName}/:id - generates audit log entry`,
    async () => {
      const created = await ctx.factory.create(meta.entityName);
      const beforeDelete = new Date();
      const auth = await ctx.authHeader("admin");

      const response = await ctx.request
        .delete(`/api/${meta.tableName}/${created.id}`)
        .set(auth);

      ctx.expect(response.status).toBe(200);

      // Poll for the async (post-commit) audit log
      const auditRows = await waitForAuditLog(ctx, {
        resourceType: meta.entityName,
        resourceId: created.id,
        actionLike: "%delete%",
        since: beforeDelete,
      });

      ctx.expect(auditRows.length).toBeGreaterThan(0);
      const auditLog = auditRows[0];
      ctx.expect(auditLog.result).toBe("success");
    },
  );
}

module.exports = {
  createGeneratesAuditLog,
  updateGeneratesAuditLog,
  deleteGeneratesAuditLog,
};
