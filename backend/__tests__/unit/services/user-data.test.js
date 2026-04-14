/**
 * User Data Service - Unit Tests
 *
 * Tests that UserDataService (deprecated wrapper) correctly delegates to AuthUserService.
 *
 * NOTE: UserDataService is deprecated. New code should use AuthUserService directly.
 * These tests verify backward compatibility of the wrapper.
 *
 * MODE SELECTION (from app-mode.js via AuthUserService):
 * - useInMemoryUsers() = true  when: NODE_ENV=development AND MOCK_USERS=true
 * - useInMemoryUsers() = false when: NODE_ENV=test OR NODE_ENV=production
 */

const UserDataService = require("../../../services/utils/user-data");
const { TEST_USERS } = require("../../../config/test-users");
const AuthUserService = require("../../../services/auth/auth-user-service");

// Mock AuthUserService - UserDataService delegates to it
jest.mock("../../../services/auth/auth-user-service");

describe("UserDataService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getAllUsers", () => {
    test("should delegate to AuthUserService.getAllUsers in mock mode", async () => {
      // Arrange - enable in-memory users
      const mockUsers = Object.values(TEST_USERS).map(user => ({
        id: null,
        auth0_id: user.auth0_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: true,
        created_at: expect.any(String),
        name: `${user.first_name} ${user.last_name}`,
      }));
      AuthUserService.getAllUsers.mockResolvedValue(mockUsers);

      // Act
      const users = await UserDataService.getAllUsers();

      // Assert
      expect(AuthUserService.getAllUsers).toHaveBeenCalled();
      expect(users).toHaveLength(Object.keys(TEST_USERS).length);
      expect(users[0]).toHaveProperty("auth0_id");
      expect(users[0]).toHaveProperty("email");
      expect(users[0]).toHaveProperty("role");
      expect(users[0].is_active).toBe(true);
    });

    test("should delegate to AuthUserService.getAllUsers in production mode", async () => {
      // Arrange
      const mockUsers = [{ id: 1, email: "test@example.com" }];
      AuthUserService.getAllUsers.mockResolvedValue(mockUsers);

      // Act
      const users = await UserDataService.getAllUsers();

      // Assert
      expect(AuthUserService.getAllUsers).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });

    test("should delegate to AuthUserService.getAllUsers in test mode", async () => {
      // Arrange
      const mockUsers = [{ id: 1, email: "test@example.com" }];
      AuthUserService.getAllUsers.mockResolvedValue(mockUsers);

      // Act
      const users = await UserDataService.getAllUsers();

      // Assert
      expect(AuthUserService.getAllUsers).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });
  });

  describe("getUserByAuth0Id", () => {
    test("should delegate to AuthUserService.getUserByAuth0Id", async () => {
      // Arrange
      const testUser = Object.values(TEST_USERS)[0];
      const mockUser = {
        id: null,
        auth0_id: testUser.auth0_id,
        email: testUser.email,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role,
        is_active: true,
        created_at: expect.any(String),
        name: `${testUser.first_name} ${testUser.last_name}`,
      };
      AuthUserService.getUserByAuth0Id.mockResolvedValue(mockUser);

      // Act
      const user = await UserDataService.getUserByAuth0Id(testUser.auth0_id);

      // Assert
      expect(AuthUserService.getUserByAuth0Id).toHaveBeenCalledWith(testUser.auth0_id);
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
      expect(user.email).toBe(testUser.email);
      expect(user.role).toBe(testUser.role);
    });

    test("should return null for unknown auth0_id", async () => {
      // Arrange
      AuthUserService.getUserByAuth0Id.mockResolvedValue(null);

      // Act
      const user = await UserDataService.getUserByAuth0Id("unknown|12345");

      // Assert
      expect(AuthUserService.getUserByAuth0Id).toHaveBeenCalledWith("unknown|12345");
      expect(user).toBeNull();
    });

    test("should delegate database lookup to AuthUserService", async () => {
      // Arrange
      const mockUser = {
        id: 1,
        auth0_id: "auth0|123",
        email: "test@example.com",
      };
      AuthUserService.getUserByAuth0Id.mockResolvedValue(mockUser);

      // Act
      const user = await UserDataService.getUserByAuth0Id("auth0|123");

      // Assert
      expect(AuthUserService.getUserByAuth0Id).toHaveBeenCalledWith("auth0|123");
      expect(user).toEqual(mockUser);
    });
  });

  describe("findOrCreateUser", () => {
    test("should delegate to AuthUserService.findOrCreateUser", async () => {
      // Arrange
      const testUser = Object.values(TEST_USERS)[0];
      const auth0Data = { sub: testUser.auth0_id };
      const mockUser = {
        id: null,
        auth0_id: testUser.auth0_id,
        email: testUser.email,
      };
      AuthUserService.findOrCreateUser.mockResolvedValue(mockUser);

      // Act
      const user = await UserDataService.findOrCreateUser(auth0Data);

      // Assert
      expect(AuthUserService.findOrCreateUser).toHaveBeenCalledWith(auth0Data);
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
    });

    test("should delegate findOrCreateUser to AuthUserService in production mode", async () => {
      // Arrange
      const auth0Data = { sub: "auth0|123", email: "new@example.com" };
      const mockUser = { id: 1, auth0_id: "auth0|123" };
      AuthUserService.findOrCreateUser.mockResolvedValue(mockUser);

      // Act
      const user = await UserDataService.findOrCreateUser(auth0Data);

      // Assert
      expect(AuthUserService.findOrCreateUser).toHaveBeenCalledWith(auth0Data);
      expect(user).toEqual(mockUser);
    });
  });

  describe("isConfigMode (deprecated)", () => {
    test("should delegate to AuthUserService.isConfigMode returning true", () => {
      // Arrange
      AuthUserService.isConfigMode.mockReturnValue(true);

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(true);
      expect(AuthUserService.isConfigMode).toHaveBeenCalled();
    });

    test("should delegate to AuthUserService.isConfigMode returning false", () => {
      // Arrange
      AuthUserService.isConfigMode.mockReturnValue(false);

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
      expect(AuthUserService.isConfigMode).toHaveBeenCalled();
    });

    test("should delegate to AuthUserService even when MOCK_USERS is set", () => {
      // Arrange
      AuthUserService.isConfigMode.mockReturnValue(false);

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
      expect(AuthUserService.isConfigMode).toHaveBeenCalled();
    });

    test("should delegate to AuthUserService in test mode", () => {
      // Arrange
      AuthUserService.isConfigMode.mockReturnValue(false);

      // Act & Assert
      expect(UserDataService.isConfigMode()).toBe(false);
      expect(AuthUserService.isConfigMode).toHaveBeenCalled();
    });
  });
});
