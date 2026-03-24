/**
 * User Data Service - Unit Tests
 *
 * Tests user data service (in-memory vs database mode)
 *
 * KISS: Simple test/dev user handling
 *
 * NOTE: Now uses GenericEntityService.findByField and findAll
 * instead of User.findByAuth0Id
 *
 * Static class - methods read env vars fresh each call
 * 
 * MODE SELECTION (from app-mode.js):
 * - useInMemoryUsers() = true  when: NODE_ENV=development AND MOCK_USERS=true
 * - useInMemoryUsers() = false when: NODE_ENV=test OR NODE_ENV=production
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
    test("should return test users in mock mode (local dev with MOCK_USERS=true)", async () => {
      // Arrange - enable in-memory users
      process.env.NODE_ENV = "development";
      process.env.MOCK_USERS = "true";

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
      process.env.NODE_ENV = "production";
      delete process.env.MOCK_USERS;
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

    test("should query database in test mode (integration tests)", async () => {
      // Arrange - test mode always uses database
      process.env.NODE_ENV = "test";
      delete process.env.MOCK_USERS;
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
    test("should find test user by auth0_id in mock mode", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.MOCK_USERS = "true";
      const testUser = Object.values(TEST_USERS)[0];

      // Act
      const user = await UserDataService.getUserByAuth0Id(testUser.auth0_id);

      // Assert
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
      expect(user.email).toBe(testUser.email);
      expect(user.role).toBe(testUser.role);
    });

    test("should return null for unknown auth0_id in mock mode", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.MOCK_USERS = "true";

      // Act
      const user = await UserDataService.getUserByAuth0Id("unknown|12345");

      // Assert
      expect(user).toBeNull();
    });

    test("should query database by auth0_id in production mode", async () => {
      // Arrange
      process.env.NODE_ENV = "production";
      delete process.env.MOCK_USERS;
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
    test("should return existing test user in mock mode", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.MOCK_USERS = "true";
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
      process.env.NODE_ENV = "production";
      delete process.env.MOCK_USERS;
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

  describe("isConfigMode (deprecated)", () => {
    test("should return true when NODE_ENV=development and MOCK_USERS=true", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.MOCK_USERS = "true";

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(true);
    });

    test("should return false in production", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      delete process.env.MOCK_USERS;

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
    });

    test("should return false when MOCK_USERS is not set in development", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      delete process.env.MOCK_USERS;

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
    });

    test("should return false in test mode (integration tests use DB)", () => {
      // Arrange
      process.env.NODE_ENV = "test";
      process.env.MOCK_USERS = "true"; // Even with this, test mode uses DB

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
    });
  });
});
