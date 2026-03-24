/**
 * Schema Endpoints - Integration Tests
 *
 * Tests schema introspection endpoints with real database
 * Validates metadata extraction for auto-generating UIs
 *
 * PATTERN: Uses TestContext for all authentication setup.
 */

const { createTestContext } = require("../core");

describe("Schema Endpoints - Integration Tests", () => {
  const ctx = createTestContext({ roles: ["admin", "technician"] });

  beforeAll(() => ctx.setup());
  afterAll(() => ctx.teardown());

  describe("GET /api/schema - List All Tables", () => {
    test("should return 200 with list of tables", async () => {
      const response = await ctx.get("/api/schema").as("technician").execute();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    test("should return 401 without authentication", async () => {
      const response = await ctx.get("/api/schema").unauthenticated().execute();
      expect(response.status).toBe(401);
    });

    test("should include expected tables", async () => {
      const response = await ctx.get("/api/schema").as("admin").execute();

      const tableNames = response.body.data.map((t) => t.name);
      expect(tableNames).toContain("users");
      expect(tableNames).toContain("roles");
    });

    test("should include table metadata", async () => {
      const response = await ctx.get("/api/schema").as("technician").execute();

      const tables = response.body.data;
      expect(tables.length).toBeGreaterThan(0);

      tables.forEach((table) => {
        expect(table).toMatchObject({
          name: expect.any(String),
          displayName: expect.any(String),
        });
      });
    });

    test("should handle concurrent requests", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => ctx.get("/api/schema").as("technician").execute());

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });
  });

  describe("GET /api/schema/:tableName - Get Table Schema", () => {
    test("should return schema for users table", async () => {
      const response = await ctx.get("/api/schema/users").as("technician").execute();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          tableName: "users",
          columns: expect.any(Array),
        }),
        timestamp: expect.any(String),
      });
    });

    test("should return schema for roles table", async () => {
      const response = await ctx.get("/api/schema/roles").as("admin").execute();

      expect(response.status).toBe(200);
      expect(response.body.data.tableName).toBe("roles");
      expect(response.body.data.columns).toBeInstanceOf(Array);
      expect(response.body.data.columns.length).toBeGreaterThan(0);
    });

    test("should return error for non-existent table", async () => {
      const response = await ctx.get("/api/schema/nonexistent_table").as("technician").execute();

      expect(response.status).toBe(200);
      expect(response.body.data.columns).toEqual([]);
    });

    test("should return 401 without authentication", async () => {
      const response = await ctx.get("/api/schema/users").unauthenticated().execute();
      expect(response.status).toBe(401);
    });

    test("should include column metadata", async () => {
      const response = await ctx.get("/api/schema/users").as("technician").execute();

      const columns = response.body.data.columns;
      expect(columns.length).toBeGreaterThan(0);

      const firstColumn = columns[0];
      expect(firstColumn).toMatchObject({
        name: expect.any(String),
        type: expect.any(String),
        nullable: expect.any(Boolean),
      });
    });

    test("should include primary key column", async () => {
      const response = await ctx.get("/api/schema/users").as("admin").execute();

      const columns = response.body.data.columns;
      const idColumn = columns.find((c) => c.name === "id");
      expect(idColumn).toBeDefined();
      expect(idColumn.name).toBe("id");
    });

    test("should identify foreign key relationships", async () => {
      const response = await ctx.get("/api/schema/users").as("technician").execute();

      const columns = response.body.data.columns;
      const roleIdColumn = columns.find((c) => c.name === "role_id");

      expect(roleIdColumn).toBeDefined();
      expect(roleIdColumn.foreignKey).toBeDefined();
      expect(roleIdColumn.foreignKey.table).toBe("roles");
      expect(roleIdColumn.foreignKey.column).toBe("id");
    });

    test("should include UI metadata (labels, types)", async () => {
      const response = await ctx.get("/api/schema/users").as("admin").execute();

      const columns = response.body.data.columns;
      const emailColumn = columns.find((c) => c.name === "email");

      expect(emailColumn).toBeDefined();
      expect(emailColumn.label).toBeDefined();
      expect(emailColumn.uiType).toBeDefined();
    });

    test("should identify searchable columns", async () => {
      const response = await ctx.get("/api/schema/users").as("technician").execute();

      const columns = response.body.data.columns;
      const searchableColumns = columns.filter((c) => c.searchable);
      expect(searchableColumns.length).toBeGreaterThan(0);
      expect(searchableColumns.some((c) => c.name === "email")).toBe(true);
    });

    test("should identify readonly columns", async () => {
      const response = await ctx.get("/api/schema/roles").as("admin").execute();

      const columns = response.body.data.columns;
      const idColumn = columns.find((c) => c.name === "id");

      expect(idColumn.readonly).toBe(true);
    });
  });

  describe("GET /api/schema/:tableName/options/:column - Get FK Options", () => {
    test("should return role options for users.role_id", async () => {
      const response = await ctx.get("/api/schema/users/options/role_id").as("technician").execute();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        timestamp: expect.any(String),
      });
    });

    test("should return 401 without authentication", async () => {
      const response = await ctx.get("/api/schema/users/options/role_id").unauthenticated().execute();
      expect(response.status).toBe(401);
    });

    test("should return 400 for non-FK column", async () => {
      const response = await ctx.get("/api/schema/users/options/email").as("admin").execute();

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test("should return error for non-existent table", async () => {
      const response = await ctx.get("/api/schema/nonexistent/options/column").as("technician").execute();
      expect([400, 404, 500]).toContain(response.status);
    });

    test("should return options with value and label", async () => {
      const response = await ctx.get("/api/schema/users/options/role_id").as("admin").execute();

      const options = response.body.data;
      expect(options.length).toBeGreaterThan(0);

      options.forEach((option) => {
        expect(option).toMatchObject({
          value: expect.any(Number),
          label: expect.any(String),
        });
      });
    });

    test("should return actual role data", async () => {
      const response = await ctx.get("/api/schema/users/options/role_id").as("technician").execute();

      const options = response.body.data;
      const roleNames = options.map((o) => o.label);

      expect(roleNames).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/admin|manager|technician|dispatcher|client/i),
        ])
      );
    });
  });

  describe("Schema Endpoints - Performance", () => {
    test("should respond quickly for table list", async () => {
      const start = Date.now();

      const response = await ctx.get("/api/schema").as("technician").execute();

      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    test("should respond quickly for table schema", async () => {
      const start = Date.now();

      const response = await ctx.get("/api/schema/users").as("admin").execute();

      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });

    test("should respond quickly for FK options", async () => {
      const start = Date.now();

      const response = await ctx.get("/api/schema/users/options/role_id").as("technician").execute();

      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Schema Endpoints - Response Format", () => {
    test("should return proper content-type", async () => {
      const response = await ctx.get("/api/schema").as("technician").execute();
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    test("should include timestamp in all responses", async () => {
      const responses = await Promise.all([
        ctx.get("/api/schema").as("technician").execute(),
        ctx.get("/api/schema/users").as("technician").execute(),
        ctx.get("/api/schema/users/options/role_id").as("technician").execute(),
      ]);

      responses.forEach((response) => {
        expect(response.body.timestamp).toBeDefined();
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp).toBeInstanceOf(Date);
      });
    });
  });
});
