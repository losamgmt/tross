/**
 * Stats API Integration Tests
 *
 * UNIFIED DATA FLOW:
 * - requirePermission reads resource from req.entityMetadata.rlsResource
 * - enforceRLS reads resource from req.entityMetadata.rlsResource
 * - extractEntity sets req.entityMetadata from URL param
 */

const request = require("supertest");
const express = require("express");
const statsRoutes = require("../../routes/stats");

// Setup minimal express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware - unified signature
jest.mock("../../middleware/auth", () => ({
  authenticateToken: (req, res, next) => {
    req.user = { role: "admin", userId: 1, email: "admin@test.com" };
    next();
  },
  requireMinimumRole: () => (req, res, next) => next(),
  requirePermission: () => (req, res, next) => next(),
}));

// Mock RLS middleware - unified signature (no args)
jest.mock("../../middleware/row-level-security", () => ({
  enforceRLS: (req, res, next) => {
    req.rlsPolicy = "all_records";
    next();
  },
}));

// Mock generic-entity middleware - only extractEntity needed now
jest.mock("../../middleware/generic-entity", () => ({
  extractEntity: (req, res, next) => {
    const entity = req.params.entity;
    const allMetadata = require("../../config/models");

    // Normalize entity name (work_order from URL)
    const normalizedName = entity.replace(/-/g, "_");

    if (!allMetadata[normalizedName]) {
      return res.status(404).json({ error: "Entity not found" });
    }

    req.entityName = normalizedName;
    req.entityMetadata = allMetadata[normalizedName];
    next();
  },
}));

// Mock database
jest.mock("../../db/connection", () => ({
  query: jest.fn(),
}));

const db = require("../../db/connection");

// Mount routes
app.use("/api/stats", statsRoutes);

describe("Stats API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/stats/:entity", () => {
    it("should return count for work_order entity", async () => {
      db.query.mockResolvedValue({ rows: [{ count: "15" }] });

      const response = await request(app)
        .get("/api/stats/work_order")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(15);
    });

    it("should return count with filters", async () => {
      db.query.mockResolvedValue({ rows: [{ count: "5" }] });

      const response = await request(app)
        .get("/api/stats/work_order?status=pending")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(5);
    });

    it("should return 404 for unknown entity", async () => {
      const response = await request(app)
        .get("/api/stats/unknown_entity")
        .expect(404);

      expect(response.body.error).toBe("Entity not found");
    });
  });

  describe("GET /api/stats/:entity/grouped/:field", () => {
    it("should return grouped counts", async () => {
      db.query.mockResolvedValue({
        rows: [
          { value: "pending", count: "5" },
          { value: "in_progress", count: "8" },
          { value: "completed", count: "12" },
        ],
      });

      const response = await request(app)
        .get("/api/stats/work_order/grouped/status")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toEqual({ value: "pending", count: 5 });
    });

    it("should return 400 for non-filterable field", async () => {
      const response = await request(app)
        .get("/api/stats/work_order/grouped/invalid_field")
        .expect(400);

      expect(response.body.message).toContain("not a filterable field");
    });
  });

  describe("GET /api/stats/:entity/sum/:field", () => {
    it("should return sum for invoice total", async () => {
      db.query.mockResolvedValue({ rows: [{ total: "25000.50" }] });

      const response = await request(app)
        .get("/api/stats/invoice/sum/total")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sum).toBe(25000.5);
    });
  });
});
