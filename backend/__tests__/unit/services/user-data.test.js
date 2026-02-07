/**
 * User Data Service - Unit Tests
 *
 * Tests user data service (config vs database mode)
 *
 * KISS: Simple test/dev user handling
 *
 * NOTE: Now uses GenericEntityService.findByField and findAll
 * instead of User.findByAuth0Id
 *
 * Static class - methods read env vars fresh each call
 */

const UserDataService = require("../../../services/user-data");
const { TEST_USERS } = require("../../../config/test-users");
const AuthUserService = require("../../../services/auth-user-service");
const GenericEntityService = require("../../../services/generic-entity-service");

jest.mock("../../../services/auth-user-service");
jest.mock("../../../services/generic-entity-service");

describe("UserDataService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getAllUsers", () => {
    test("should return test users in config mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "true";
      process.env.NODE_ENV = "development";

      // Act
      const users = await UserDataService.getAllUsers();

      // Assert
      expect(users).toHaveLength(Object.keys(TEST_USERS).length);
      expect(users[0]).toHaveProperty("auth0_id");
      expect(users[0]).toHaveProperty("email");
      expect(users[0]).toHaveProperty("role");
      expect(users[0].is_active).toBe(true);
    });

    test("should query database in production mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "false";
      process.env.NODE_ENV = "production";
      const mockUsers = [{ id: 1, email: "test@example.com" }];
      GenericEntityService.findAll.mockResolvedValue({ data: mockUsers });

      // Act
      const users = await UserDataService.getAllUsers();

      // Assert
      expect(GenericEntityService.findAll).toHaveBeenCalledWith("user", {
        includeInactive: false,
      });
      expect(users).toEqual(mockUsers);
    });
  });

  describe("getUserByAuth0Id", () => {
    test("should find test user by auth0_id in config mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "true";
      process.env.NODE_ENV = "development";
      const testUser = Object.values(TEST_USERS)[0];

      // Act
      const user = await UserDataService.getUserByAuth0Id(testUser.auth0_id);

      // Assert
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
      expect(user.email).toBe(testUser.email);
      expect(user.role).toBe(testUser.role);
    });

    test("should return null for unknown auth0_id in config mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "true";
      process.env.NODE_ENV = "development";

      // Act
      const user = await UserDataService.getUserByAuth0Id("unknown|12345");

      // Assert
      expect(user).toBeNull();
    });

    test("should query database by auth0_id in production mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "false";
      process.env.NODE_ENV = "production";
      const mockUser = {
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
      };
      GenericEntityService.findByField.mockResolvedValue(mockUser);

      // Act
      const user = await UserDataService.getUserByAuth0Id("auth0|123");

      // Assert
      expect(GenericEntityService.findByField).toHaveBeenCalledWith(
        "user",
        "auth0_id",
        "auth0|123",
      );
      expect(user).toEqual(mockUser);
    });
  });

  describe("findOrCreateUser", () => {
    test("should return existing test user in config mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "true";
      process.env.NODE_ENV = "development";
      const testUser = Object.values(TEST_USERS)[0];
      const auth0Data = { sub: testUser.auth0_id };

      // Act
      const user = await UserDataService.findOrCreateUser(auth0Data);

      // Assert
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
    });

    test("should call AuthUserService.findOrCreateFromAuth0 in production mode", async () => {
      // Arrange
      process.env.USE_TEST_AUTH = "false";
      process.env.NODE_ENV = "production";
      const auth0Data = { sub: "auth0|123", email: "new@example.com" };
      const mockUser = { id: 1, auth0_id: "auth0|123" };
      AuthUserService.findOrCreateFromAuth0.mockResolvedValue(mockUser);

      // Act
      const user = await UserDataService.findOrCreateUser(auth0Data);

      // Assert
      expect(AuthUserService.findOrCreateFromAuth0).toHaveBeenCalledWith(
        auth0Data,
      );
      expect(user).toEqual(mockUser);
    });
  });

  describe("isConfigMode", () => {
    test("should return true when USE_TEST_AUTH=true and NODE_ENV=development", () => {
      // Arrange
      process.env.USE_TEST_AUTH = "true";
      process.env.NODE_ENV = "development";

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(true);
    });

    test("should return false in production", () => {
      // Arrange
      process.env.USE_TEST_AUTH = "false";
      process.env.NODE_ENV = "production";

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
    });

    test("should return false when USE_TEST_AUTH=false even in development", () => {
      // Arrange
      process.env.USE_TEST_AUTH = "false";
      process.env.NODE_ENV = "development";

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
    });
  });
});
