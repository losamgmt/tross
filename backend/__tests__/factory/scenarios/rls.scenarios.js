/**
 * RLS (Row-Level Security) Test Scenarios
 *
 * Pure functions testing role-based access control.
 * Driven by fieldAccess in metadata and permissions.json.
 */

const permissions = require("../../../../config/permissions.json");
const { ROLE_HIERARCHY } = require("../../../config/role-definitions");

// Role priority order from single source of truth
const ROLE_ORDER = ROLE_HIERARCHY;

/**
 * Get roles that should be DENIED for a given operation
 */
function getDeniedRoles(resourceName, operation) {
  const resource = permissions.resources[resourceName];
  if (!resource?.permissions?.[operation]) return [];

  const minPriority = resource.permissions[operation].minimumPriority;
  return ROLE_ORDER.filter(
    (role) => permissions.roles[role].priority < minPriority,
  );
}

/**
 * Scenario: Unauthenticated requests denied
 *
 * Preconditions: None (all protected endpoints)
 * Tests: Requests without auth token return 401
 */
function unauthenticatedDenied(meta, ctx) {
  ctx.it(`GET /api/${meta.tableName} - returns 401 without auth`, async () => {
    const response = await ctx.request.get(`/api/${meta.tableName}`);
    ctx.expect(response.status).toBe(401);
  });
}

/**
 * Scenario: Roles below minimum denied for CREATE
 *
 * Preconditions: Entity has rlsResource defined in metadata
 * Tests: Roles below minimumRole get 403 on POST
 */
function createPermissionDenied(meta, ctx) {
  const { rlsResource, tableName } = meta;
  if (!rlsResource) return;

  const deniedRoles = getDeniedRoles(rlsResource, "create");
  if (!deniedRoles.length) return;

  for (const role of deniedRoles) {
    ctx.it(
      `POST /api/${tableName} - returns 403 for ${role} role`,
      async () => {
        // Use buildMinimalWithFKs to ensure payload has all required FKs
        const payload = await ctx.factory.buildMinimalWithFKs(meta.entityName);
        const auth = await ctx.authHeader(role);

        const response = await ctx.request
          .post(`/api/${tableName}`)
          .set(auth)
          .send(payload);

        ctx.expect(response.status).toBe(403);
      },
    );
  }
}

/**
 * Scenario: Roles below minimum denied for UPDATE
 *
 * Preconditions: Entity has rlsResource defined
 * Tests: Roles below minimumRole get 403 on PATCH
 */
function updatePermissionDenied(meta, ctx) {
  const { rlsResource, tableName, entityName } = meta;
  if (!rlsResource) return;

  const deniedRoles = getDeniedRoles(rlsResource, "update");
  if (!deniedRoles.length) return;

  for (const role of deniedRoles) {
    ctx.it(
      `PATCH /api/${tableName}/:id - returns 403 for ${role} role`,
      async () => {
        const created = await ctx.factory.create(entityName);
        const auth = await ctx.authHeader(role);

        const response = await ctx.request
          .patch(`/api/${tableName}/${created.id}`)
          .set(auth)
          .send({ is_active: true });

        ctx.expect(response.status).toBe(403);
      },
    );
  }
}

/**
 * Scenario: Roles below minimum denied for DELETE
 *
 * Preconditions: Entity has rlsResource defined
 * Tests: Roles below minimumRole get 403 on DELETE
 */
function deletePermissionDenied(meta, ctx) {
  const { rlsResource, tableName, entityName } = meta;
  if (!rlsResource) return;

  const deniedRoles = getDeniedRoles(rlsResource, "delete");
  if (!deniedRoles.length) return;

  for (const role of deniedRoles) {
    ctx.it(
      `DELETE /api/${tableName}/:id - returns 403 for ${role} role`,
      async () => {
        const created = await ctx.factory.create(entityName);
        const auth = await ctx.authHeader(role);

        const response = await ctx.request
          .delete(`/api/${tableName}/${created.id}`)
          .set(auth);

        ctx.expect(response.status).toBe(403);
      },
    );
  }
}

/**
 * Scenario: Sensitive fields never exposed
 *
 * Preconditions: Entity has sensitiveFields defined
 * Tests: A populated sensitive field is stored in the DB yet stripped from the
 *   API response — while the record itself is still returned. Forcing a known
 *   value defeats the null-in-DB false pass (a field that is simply never
 *   populated would "pass" the old absence-only assertion for the wrong reason).
 */
function sensitiveFieldsHidden(meta, ctx) {
  const { sensitiveFields, tableName, entityName, primaryKey = "id" } = meta;
  if (!sensitiveFields?.length) return;

  ctx.it(
    `GET /api/${tableName}/:id - never exposes sensitive fields even when populated`,
    async () => {
      const created = await ctx.factory.create(entityName);
      const auth = await ctx.authHeader("admin");

      // Force a known, unique value into every sensitive field so a null-in-DB
      // cannot produce a false pass. Unique per record+field to avoid tripping
      // UNIQUE constraints (e.g. users.auth0_id).
      const sentinelFor = (field) => `SENSITIVE_${field}_${created.id}`;
      const setClause = sensitiveFields
        .map((field, i) => `${field} = $${i + 1}`)
        .join(", ");
      const params = [...sensitiveFields.map(sentinelFor), created.id];
      const updated = await ctx.db.query(
        `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = $${sensitiveFields.length + 1} RETURNING ${sensitiveFields.join(", ")}`,
        params,
      );

      // Prove the sensitive values are actually persisted in the DB
      ctx.expect(updated.rows).toHaveLength(1);
      for (const field of sensitiveFields) {
        ctx.expect(updated.rows[0][field]).toBe(sentinelFor(field));
      }

      const response = await ctx.request
        .get(`/api/${tableName}/${created.id}`)
        .set(auth);

      ctx.expect(response.status).toBe(200);
      const data = response.body.data || response.body;

      // The record WAS returned (the filtering path ran; it did not blank the
      // row)...
      ctx.expect(data[primaryKey]).toBe(created.id);
      // ...yet every populated sensitive field is stripped from the response.
      for (const field of sensitiveFields) {
        ctx.expect(data[field]).toBeUndefined();
      }
    },
  );
}

module.exports = {
  unauthenticatedDenied,
  createPermissionDenied,
  updatePermissionDenied,
  deletePermissionDenied,
  sensitiveFieldsHidden,
};
