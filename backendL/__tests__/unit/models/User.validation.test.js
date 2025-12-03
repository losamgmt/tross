/**
 * User Model - Validation Tests
 *
 * Tests input validation, error handling, and constraint violations for User model.
 * Covers missing fields, invalid data, duplicate constraints, and database errors.
 *
 * Part of User model test suite:
 * - User.crud.test.js - CRUD operations
 * - User.validation.test.js (this file) - Input validation and error handling
 * - User.relationships.test.js - Role relationships and foreign keys
 */

// Setup centralized mocks FIRST
const { setupModuleMocks } = require("../../setup/test-setup");
setupModuleMocks();

// NOW import modules
const User = require("../../../db/models/User");
const db = require("../../../db/connection");

describe("User Model - Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ===========================
  // findByAuth0Id() validation
  // ===========================
  describe("findByAuth0Id() - Validation", () => {
    it("should throw error when Auth0 ID is missing", async () => {
      // Act & Assert
      await expect(User.findByAuth0Id(null)).rejects.toThrow(
        "Auth0 ID is required",
      );
      await expect(User.findByAuth0Id("")).rejects.toThrow(
        "Auth0 ID is required",
      );
      await expect(User.findByAuth0Id(undefined)).rejects.toThrow(
        "Auth0 ID is required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database connection failed"));

      // Act & Assert
      await expect(User.findByAuth0Id("auth0|123")).rejects.toThrow(
        "Failed to find user",
      );
    });
  });

  // ===========================
  // findById() validation
  // ===========================
  describe("findById() - Validation", () => {
    it("should throw error when ID is missing", async () => {
      // Act & Assert - verify it THROWS, don't care about exact message
      await expect(User.findById(null)).rejects.toThrow();
      await expect(User.findById(undefined)).rejects.toThrow();
      await expect(User.findById(0)).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
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
    it("should handle database errors gracefully", async () => {
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
    it("should throw error when Auth0 ID is missing", async () => {
      // Arrange
      const invalidData = { email: "test@example.com" };

      // Act & Assert
      await expect(User.createFromAuth0(invalidData)).rejects.toThrow(
        "Auth0 ID and email are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when email is missing", async () => {
      // Arrange
      const invalidData = { sub: "auth0|123" };

      // Act & Assert
      await expect(User.createFromAuth0(invalidData)).rejects.toThrow(
        "Auth0 ID and email are required",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should handle duplicate Auth0 ID constraint violation", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|existing",
        email: "existing@example.com",
      };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_auth0_id_key";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.createFromAuth0(auth0Data)).rejects.toThrow(
        "User already exists",
      );
    });

    it("should handle duplicate email constraint violation", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|new",
        email: "duplicate@example.com",
      };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_email_key";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.createFromAuth0(auth0Data)).rejects.toThrow(
        "Email already exists",
      );
    });

    it("should handle generic database errors", async () => {
      // Arrange
      const auth0Data = {
        sub: "auth0|test",
        email: "test@example.com",
      };
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(User.createFromAuth0(auth0Data)).rejects.toThrow(
        "Failed to create user",
      );
    });
  });

  // ===========================
  // findOrCreate() validation
  // ===========================
  describe("findOrCreate() - Validation", () => {
    it("should throw error when auth0Data is missing", async () => {
      // Act & Assert
      await expect(User.findOrCreate(null)).rejects.toThrow(
        "Invalid Auth0 data",
      );
      await expect(User.findOrCreate({})).rejects.toThrow("Invalid Auth0 data");
      await expect(
        User.findOrCreate({ email: "test@example.com" }),
      ).rejects.toThrow("Invalid Auth0 data");
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should propagate errors from findByAuth0Id", async () => {
      // Arrange
      const auth0Data = { sub: "auth0|test", email: "test@example.com" };
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      // findByAuth0Id catches database errors and re-throws as "Failed to find user"
      await expect(User.findOrCreate(auth0Data)).rejects.toThrow(
        "Failed to find user",
      );
    });

    it("should propagate errors from createFromAuth0", async () => {
      // Arrange
      const auth0Data = { sub: "auth0|test", email: "test@example.com" };
      const dbError = new Error("Database error");
      db.query
        .mockResolvedValueOnce({ rows: [] }) // findByAuth0Id - not found
        .mockResolvedValueOnce({ rows: [] }) // email check - not found
        .mockRejectedValueOnce(dbError); // create fails

      // Act & Assert
      await expect(User.findOrCreate(auth0Data)).rejects.toThrow(
        "Failed to create user",
      );
    });
  });

  // ===========================
  // create() validation
  // ===========================
  describe("create() - Validation", () => {
    it("should throw error when email is missing", async () => {
      // Arrange
      const userData = { first_name: "No", last_name: "Email" };

      // Act & Assert
      await expect(User.create(userData)).rejects.toThrow("Email is required");
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should handle duplicate email constraint violation", async () => {
      // Arrange
      const userData = { email: "duplicate@example.com", role_id: 2 };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_email_key";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.create(userData)).rejects.toThrow(
        "Email already exists",
      );
    });

    it("should handle generic database errors", async () => {
      // Arrange
      const userData = { email: "error@example.com", role_id: 2 };
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(User.create(userData)).rejects.toThrow(
        "Failed to create user",
      );
    });
  });

  // ===========================
  // update() validation
  // ===========================
  describe("update() - Validation", () => {
    it("should throw error when user ID is missing", async () => {
      // Act & Assert - behavior: throws and doesn't query
      await expect(
        User.update(null, { email: "test@example.com" }),
      ).rejects.toThrow();
      await expect(
        User.update(undefined, { email: "test@example.com" }),
      ).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when updates is missing or invalid", async () => {
      // Act & Assert - behavior: throws and doesn't query
      await expect(User.update(1, null)).rejects.toThrow();
      await expect(User.update(1, undefined)).rejects.toThrow();
      await expect(User.update(1, "not an object")).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when no valid fields to update", async () => {
      // Act & Assert
      await expect(User.update(1, {})).rejects.toThrow(
        "No valid fields to update",
      );
      await expect(User.update(1, { invalid_field: "value" })).rejects.toThrow(
        "No valid fields to update",
      );
      await expect(User.update(1, { password: "ignored" })).rejects.toThrow(
        "No valid fields to update",
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      // Arrange
      const updates = { email: "test@example.com" };
      db.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      // The code catches "User not found" and re-throws as "Failed to update user"
      await expect(User.update(999, updates)).rejects.toThrow(
        "Failed to update user",
      );
    });

    it("should handle duplicate email constraint violation", async () => {
      // Arrange
      const updates = { email: "duplicate@example.com" };
      const dbError = new Error("Duplicate key");
      dbError.constraint = "users_email_key";
      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.update(1, updates)).rejects.toThrow(
        "Email already exists",
      );
    });

    it("should handle generic database errors", async () => {
      // Arrange
      const updates = { email: "test@example.com" };
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(User.update(1, updates)).rejects.toThrow(
        "Failed to update user",
      );
    });
  });

  // ===========================
  // delete() validation
  // ===========================
  describe("delete() - Validation", () => {
    it("should throw error when user ID is missing", async () => {
      // Act & Assert - behavior: throws and doesn't query
      await expect(User.delete(null)).rejects.toThrow();
      await expect(User.delete(undefined)).rejects.toThrow();
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act & Assert
      await expect(User.delete(999)).rejects.toThrow("User not found");
    });

    it("should handle database errors during deletion", async () => {
      // Arrange
      db.query.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(User.delete(1)).rejects.toThrow("Database error");
    });
  });
});
