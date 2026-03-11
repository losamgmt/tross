/**
 * Sub-Entity Middleware - Unit Tests
 *
 * Tests for the generic sub-entity middleware.
 * ADR-011: Uses rule-based RLS context (no filterConfig lookup).
 */

const {
  attachParentMetadata,
  requireParentPermission,
  requireServiceConfigured,
  requireParentExists,
  requireParentAccess,
  setPolymorphicContext,
  getActionVerb,
} = require("../../../middleware/sub-entity");

// Mock pool for requireParentAccess
jest.mock("../../../db/connection", () => ({
  pool: {
    query: jest.fn(),
  },
}));

// Mock buildRLSFilter for requireParentAccess
jest.mock("../../../db/helpers/rls", () => ({
  buildRLSFilter: jest.fn(),
}));

// Mock allMetadata for requireParentAccess
jest.mock("../../../config/models", () => ({
  work_order: {
    entityKey: "work_order",
    tableName: "work_orders",
    rlsResource: "work_orders",
    rlsRules: [{ id: "test-rule", roles: "*", operations: "*", access: null }],
  },
  asset: {
    entityKey: "asset",
    tableName: "assets",
    rlsResource: "assets",
    rlsRules: [{ id: "test-rule", roles: "*", operations: "*", access: null }],
  },
}));

const { pool } = require("../../../db/connection");
const { buildRLSFilter } = require("../../../db/helpers/rls");

describe("Sub-Entity Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      permissions: {
        hasPermission: jest.fn(),
      },
      params: { id: "123" },
    };
    res = {};
    next = jest.fn();
  });

  describe("attachParentMetadata", () => {
    it("should attach metadata to request and call next", () => {
      const metadata = { entityKey: "work_order", rlsResource: "work_order" };

      attachParentMetadata(metadata)(req, res, next);

      expect(req.parentMetadata).toBe(metadata);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("requireParentPermission", () => {
    beforeEach(() => {
      req.parentMetadata = {
        entityKey: "work_order",
        rlsResource: "work_order",
      };
    });

    it("should call next() when user has permission", () => {
      req.permissions.hasPermission.mockReturnValue(true);

      requireParentPermission("update")(req, res, next);

      expect(req.permissions.hasPermission).toHaveBeenCalledWith(
        "work_order",
        "update",
      );
      expect(next).toHaveBeenCalledWith();
    });

    it("should call next with 403 error when user lacks permission", () => {
      req.permissions.hasPermission.mockReturnValue(false);

      requireParentPermission("update")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("don't have permission");
    });

    it("should call next with 500 error when metadata is missing", () => {
      req.parentMetadata = null;
      req.entityMetadata = null;

      requireParentPermission("read")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(500);
    });

    it("should fall back to entityMetadata if parentMetadata is missing", () => {
      req.parentMetadata = null;
      req.entityMetadata = { entityKey: "contract", rlsResource: "contract" };
      req.permissions.hasPermission.mockReturnValue(true);

      requireParentPermission("read")(req, res, next);

      expect(req.permissions.hasPermission).toHaveBeenCalledWith(
        "contract",
        "read",
      );
      expect(next).toHaveBeenCalledWith();
    });

    it("should handle missing permissions object gracefully", () => {
      req.permissions = null;

      requireParentPermission("read")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  describe("getActionVerb", () => {
    it('should return "view" for read', () => {
      expect(getActionVerb("read")).toBe("view");
    });

    it('should return "add to" for create', () => {
      expect(getActionVerb("create")).toBe("add to");
    });

    it('should return "modify" for update', () => {
      expect(getActionVerb("update")).toBe("modify");
    });

    it('should return "delete from" for delete', () => {
      expect(getActionVerb("delete")).toBe("delete from");
    });

    it("should return operation name for unknown operations", () => {
      expect(getActionVerb("archive")).toBe("archive");
    });
  });

  describe("requireServiceConfigured", () => {
    it("should call next() when service is configured", () => {
      const checkFn = jest.fn().mockReturnValue(true);

      requireServiceConfigured(checkFn, "File storage")(req, res, next);

      expect(checkFn).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it("should call next with 503 error when service is not configured", () => {
      const checkFn = jest.fn().mockReturnValue(false);

      requireServiceConfigured(checkFn, "File storage")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(503);
      expect(error.message).toContain("File storage");
      expect(error.message).toContain("not configured");
    });
  });

  describe("requireParentExists", () => {
    beforeEach(() => {
      req.parentMetadata = {
        entityKey: "work_order",
        rlsResource: "work_order",
      };
    });

    it("should call next() and set parentId when entity exists", async () => {
      const existsFn = jest.fn().mockResolvedValue(true);

      await requireParentExists(existsFn)(req, res, next);

      expect(existsFn).toHaveBeenCalledWith("work_order", 123);
      expect(req.parentId).toBe(123);
      expect(next).toHaveBeenCalledWith();
    });

    it("should call next with 404 error when entity does not exist", async () => {
      const existsFn = jest.fn().mockResolvedValue(false);

      await requireParentExists(existsFn)(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("work_order");
      expect(error.message).toContain("123");
    });

    it("should propagate errors from existsFn", async () => {
      const dbError = new Error("Database connection failed");
      const existsFn = jest.fn().mockRejectedValue(dbError);

      await requireParentExists(existsFn)(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("setPolymorphicContext", () => {
    it("should set polymorphicContext from params.id", () => {
      req.params.id = "123";

      setPolymorphicContext("work_order")(req, res, next);

      expect(req.polymorphicContext).toEqual({
        parentType: "work_order",
        parentId: 123,
      });
      expect(next).toHaveBeenCalledWith();
    });

    it("should prefer validated.id over params.id", () => {
      req.validated = { id: 456 };
      req.params.id = "123";

      setPolymorphicContext("asset")(req, res, next);

      expect(req.polymorphicContext).toEqual({
        parentType: "asset",
        parentId: 456,
      });
    });

    it("should use custom idParam when specified", () => {
      req.params.parentId = "789";

      setPolymorphicContext("work_order", "parentId")(req, res, next);

      expect(req.polymorphicContext).toEqual({
        parentType: "work_order",
        parentId: 789,
      });
    });

    it("should set parentId to null for invalid ID", () => {
      req.params.id = "invalid";

      setPolymorphicContext("work_order")(req, res, next);

      expect(req.polymorphicContext).toEqual({
        parentType: "work_order",
        parentId: null,
      });
    });
  });

  describe("requireParentAccess", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      req.params.id = "123";
      req.method = "GET";
      req.dbUser = {
        id: 1,
        role: "customer",
        customer_profile_id: 42,
      };
    });

    it("should call next() when parent exists and is accessible", async () => {
      buildRLSFilter.mockReturnValue({
        clause: "work_orders.customer_id = $2",
        params: [42],
        applied: true,
      });
      pool.query.mockResolvedValue({ rows: [{ id: 123 }] });

      await requireParentAccess("work_order")(req, res, next);

      expect(buildRLSFilter).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalled();
      expect(req.parentId).toBe(123);
      expect(req.parentEntity).toEqual({ id: 123 });
      expect(req.polymorphicContext).toEqual({
        parentType: "work_order",
        parentId: 123,
      });
      expect(next).toHaveBeenCalledWith();
    });

    it("should return 404 when parent not found", async () => {
      buildRLSFilter.mockReturnValue({
        clause: "",
        params: [],
        applied: false,
      });
      pool.query.mockResolvedValue({ rows: [] }); // Empty = not found

      await requireParentAccess("work_order")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should return 404 when RLS denies access (hides existence)", async () => {
      buildRLSFilter.mockReturnValue({
        clause: "1=0", // Deny clause
        params: [],
        applied: true,
      });

      await requireParentAccess("work_order")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(pool.query).not.toHaveBeenCalled(); // Short-circuits before query
    });

    it("should return 400 for invalid parent ID", async () => {
      req.params.id = "invalid";

      await requireParentAccess("work_order")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for zero ID", async () => {
      req.params.id = "0";

      await requireParentAccess("work_order")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    it("should return 500 for unknown entity key", async () => {
      await requireParentAccess("unknown_entity")(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
    });

    it("should prefer validated.id over params.id", async () => {
      req.validated = { id: 999 };
      req.params.id = "123";
      buildRLSFilter.mockReturnValue({ clause: "", params: [], applied: false });
      pool.query.mockResolvedValue({ rows: [{ id: 999 }] });

      await requireParentAccess("work_order")(req, res, next);

      expect(req.parentId).toBe(999);
    });

    it("should use custom idParam when specified", async () => {
      req.params.parentId = "456";
      delete req.params.id;
      buildRLSFilter.mockReturnValue({ clause: "", params: [], applied: false });
      pool.query.mockResolvedValue({ rows: [{ id: 456 }] });

      await requireParentAccess("work_order", "parentId")(req, res, next);

      expect(req.parentId).toBe(456);
    });

    it("should pass correct operation from HTTP method", async () => {
      req.method = "POST";
      buildRLSFilter.mockReturnValue({ clause: "", params: [], applied: false });
      pool.query.mockResolvedValue({ rows: [{ id: 123 }] });

      await requireParentAccess("work_order")(req, res, next);

      // buildRLSFilter is called with 'read' operation (always check read for parent)
      expect(buildRLSFilter).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "create" }), // From POST method
        expect.anything(),
        "read", // Always check read permission
        2,
        expect.anything(),
      );
    });

    it("should propagate database errors", async () => {
      const dbError = new Error("Database connection failed");
      buildRLSFilter.mockReturnValue({ clause: "", params: [], applied: false });
      pool.query.mockRejectedValue(dbError);

      await requireParentAccess("work_order")(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});
