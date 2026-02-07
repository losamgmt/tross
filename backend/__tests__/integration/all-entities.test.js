/**
 * All Entities Integration Tests
 *
 * FACTORY-OF-FACTORIES: Iterates over ALL entities that use generic CRUD.
 * Adding a new entity automatically gets test coverage (no drift).
 *
 * PRINCIPLE: Zero entity-specific code. Metadata drives everything.
 *
 * COVERAGE:
 * - All entities in getGenericCrudEntityNames() are tested
 * - Each entity runs ALL applicable scenario categories
 * - Scenarios self-select based on entity metadata
 *
 * EXCLUDED ENTITIES (specialized routes, tested elsewhere):
 * - preferences: /api/preferences (GET/PUT pattern)
 * - file_attachment: /api/:entityType/:entityId/files (polymorphic)
 */

const { runEntityTests } = require("../factory/runner");
const {
  getGenericCrudEntityNames,
  getSpecializedRouteEntityNames,
  assertValidMetadata,
} = require("../factory/entity-registry");
const {
  setupTestDatabase,
  cleanupTestDatabase,
} = require("../helpers/test-db");
const app = require("../../server");
const db = require("../../db/connection");

// Validate metadata before running tests (fail fast)
beforeAll(() => {
  assertValidMetadata();
});

describe("All Entities Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // ============================================================================
  // GENERIC CRUD ENTITIES
  // Auto-discovered from config/models, filtered by generic CRUD support
  // ============================================================================

  const genericCrudEntities = getGenericCrudEntityNames();

  describe(`Generic CRUD Entities (${genericCrudEntities.length} total)`, () => {
    for (const entityName of genericCrudEntities) {
      describe(`${entityName}`, () => {
        runEntityTests(entityName, { app, db: db.pool });
      });
    }
  });

  // ============================================================================
  // DOCUMENTATION: Specialized Route Entities
  // These are tested in separate files with specialized scenarios
  // ============================================================================

  describe("Specialized Route Entities (documentation)", () => {
    const specializedEntities = getSpecializedRouteEntityNames();

    test(`${specializedEntities.length} entities use specialized routes`, () => {
      // This test documents which entities are NOT tested here
      // preferences was moved to generic router (2026-01-23)
      expect(specializedEntities).toContain("file_attachment");
      expect(specializedEntities).toContain("audit_log");

      // Log for visibility
      console.log(
        `Specialized route entities (tested separately): ${specializedEntities.join(", ")}`,
      );
    });
  });
});
