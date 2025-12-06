/**
 * User Model - Validation Tests
 *
 * Tests input validation, error handling, and constraint violations for User model.
 * Covers missing fields, invalid data, duplicate constraints, and database errors.
 *
 * NOTE: findByAuth0Id validation tests removed - method moved to GenericEntityService.findByField
 * NOTE: createFromAuth0/findOrCreate validation now delegated to auth0-mapper utility
 *
 * Part of User model test suite:
 * - User.crud.test.js - CRUD operations
 * - User.validation.test.js (this file) - Input validation and error handling
 * - User.relationships.test.js - Role relationships and foreign keys
 */

// Setup centralized mocks FIRST
const { setupModuleMocks } = require("../../setup/test-setup");
setupModuleMocks();

// Mock GenericEntityService
jest.mock("../../../services/generic-entity-service");

// NOW import modules
const User = require("../../../db/models/User");
const db = require("../../../db/connection");
const GenericEntityService = require("../../../services/generic-entity-service");

describe("User Model - Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // NOTE: findByAuth0Id validation tests removed
  // Method moved to GenericEntityService.findByField('user', 'auth0_id', value)
  // See: generic-entity-service.findByField.test.js

  // ===========================
  // findById() validation
  // ===========================
  describe("findById() - Validation", () => {
    test("should throw error when ID is missing", async () => {
      // Act & Assert - verify it THROWS, don't care about exact message
      await expect(User.findById(null)).rejects.toThrow();
      await expect(User.findById(undefined)).rejects.toThrow();
      await expect(User.findById(0)).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should handle database errors gracefully", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(User.findById(1)).rejects.toThrow("Failed to find user");
    });
  });

  // ===========================
  // findAll() validation
  // ===========================
  describe("findAll() - Error Handling", () => {
    test("should handle database errors gracefully", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Connection lost"));

      // Act & Assert
      await expect(User.findAll()).rejects.toThrow("Failed to retrieve users");
    });
  });

  // ===========================
  // createFromAuth0() validation
  // ===========================
  describe("createFromAuth0() - Validation", () => {
    test("should throw error when Auth0 data is missing", async () => {
      // Auth0-mapper validates the data
      await expect(User.createFromAuth0(null)).rejects.toThrow(
        "Auth0 data is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should throw error when Auth0 ID is missing", async () => {
      // Auth0-mapper validates sub
      const invalidData = { email: "test@example.com" };
      await expect(User.createFromAuth0(invalidData)).rejects.toThrow(
        "Auth0 sub (user ID) is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should throw error when email is missing", async () => {
      // Auth0-mapper validates email
      const invalidData = { sub: "auth0|123" };
      await expect(User.createFromAuth0(invalidData)).rejects.toThrow(
        "Auth0 email is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should handle duplicate Auth0 ID constraint violation", async () => {
      const auth0Data = {
        sub: "auth0|existing",
        email: "existing@example.com",
      };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_auth0_id_key";
      db.query.mockRejectedValue(dbError);

      await expect(User.createFromAuth0(auth0Data)).rejects.toThrow(
        "User already exists",
      );
    });

    test("should handle duplicate email constraint violation", async () => {
      const auth0Data = {
        sub: "auth0|new",
        email: "duplicate@example.com",
      };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_email_key";
      db.query.mockRejectedValue(dbError);

      await expect(User.createFromAuth0(auth0Data)).rejects.toThrow(
        "Email already exists",
      );
    });

    test("should handle generic database errors", async () => {
      const auth0Data = {
        sub: "auth0|test",
        email: "test@example.com",
      };
      db.query.mockRejectedValue(new Error("Database error"));

      await expect(User.createFromAuth0(auth0Data)).rejects.toThrow(
        "Failed to create user",
      );
    });
  });

  // ===========================
  // findOrCreate() validation
  // ===========================
  describe("findOrCreate() - Validation", () => {
    test("should throw error when auth0Data is missing", async () => {
      // Auth0-mapper validates the data
      await expect(User.findOrCreate(null)).rejects.toThrow(
        "Auth0 data is required",
      );
      expect(GenericEntityService.findByField).not.toHaveBeenCalled();
    });

    test("should throw error when sub is missing", async () => {
      // Auth0-mapper validates sub
      await expect(User.findOrCreate({ email: "test@example.com" })).rejects.toThrow(
        "Auth0 sub (user ID) is required",
      );
      expect(GenericEntityService.findByField).not.toHaveBeenCalled();
    });

    test("should propagate errors from GenericEntityService", async () => {
      // Arrange
      GenericEntityService.findByField.mockRejectedValue(new Error("Service error"));

      // Act & Assert
      await expect(
        User.findOrCreate({ sub: "auth0|test", email: "test@example.com" }),
      ).rejects.toThrow("Service error");
    });
  });

  // ===========================
  // create() validation
  // ===========================
  describe("create() - Validation", () => {
    test("should throw error when email is missing", async () => {
      await expect(User.create({ first_name: "Test" })).rejects.toThrow(
        "Email is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should throw error when email is empty string", async () => {
      await expect(User.create({ email: "  " })).rejects.toThrow(
        "Email is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    test("should handle duplicate email constraint violation", async () => {
      // Arrange - need to mock GenericEntityService for default role lookup
      GenericEntityService.findByField.mockResolvedValue({ id: 1, name: "customer" });
      
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_email_key";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        User.create({ email: "duplicate@example.com" }),
      ).rejects.toThrow("Email already exists");
    });
  });

  // ===========================
  // update() validation
  // ===========================
  describe("update() - Validation", () => {
    test("should throw error when no updates provided", async () => {
      await expect(User.update(1, {})).rejects.toThrow();
    });

    test("should throw error when updates is not an object", async () => {
      await expect(User.update(1, null)).rejects.toThrow();
      await expect(User.update(1, "string")).rejects.toThrow();
    });

    test("should throw error when ID is invalid", async () => {
      await expect(User.update(null, { first_name: "Test" })).rejects.toThrow();
      await expect(User.update(0, { first_name: "Test" })).rejects.toThrow();
      await expect(User.update(-1, { first_name: "Test" })).rejects.toThrow();
    });

    test("should handle duplicate email constraint violation", async () => {
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_email_key";
      db.query.mockRejectedValue(dbError);

      await expect(
        User.update(1, { email: "duplicate@example.com" }),
      ).rejects.toThrow("Email already exists");
    });
  });

  // ===========================
  // delete() validation
  // ===========================
  describe("delete() - Validation", () => {
    test("should throw error when ID is invalid", async () => {
      await expect(User.delete(null)).rejects.toThrow();
      await expect(User.delete(0)).rejects.toThrow();
      await expect(User.delete(-1)).rejects.toThrow();
    });
  });
});
