/**
 * User Data Service - Unit Tests
 *
 * Tests user data service (config vs database mode)
 *
 * KISS: Simple test/dev user handling
 */

const { UserDataService } = require('../../../services/user-data');
const { TEST_USERS } = require('../../../config/test-users');
const User = require('../../../db/models/User');

jest.mock('../../../db/models/User');

describe('UserDataService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getAllUsers', () => {
    it('should return test users in config mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'true';
      process.env.NODE_ENV = 'development';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();

      // Act
      const users = await service.getAllUsers();

      // Assert
      expect(users).toHaveLength(Object.keys(TEST_USERS).length);
      expect(users[0]).toHaveProperty('auth0_id');
      expect(users[0]).toHaveProperty('email');
      expect(users[0]).toHaveProperty('role');
      expect(users[0].is_active).toBe(true);
    });

    it('should query database in production mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'false';
      process.env.NODE_ENV = 'production';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();
      const mockUsers = [{ id: 1, email: 'test@example.com' }];
      User.findAll.mockResolvedValue({ data: mockUsers });

      // Act
      const users = await service.getAllUsers();

      // Assert
      expect(User.findAll).toHaveBeenCalledWith({ includeInactive: false });
      expect(users).toEqual(mockUsers);
    });
  });

  describe('getUserByAuth0Id', () => {
    it('should find test user by auth0_id in config mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'true';
      process.env.NODE_ENV = 'development';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();
      const testUser = Object.values(TEST_USERS)[0];

      // Act
      const user = await service.getUserByAuth0Id(testUser.auth0_id);

      // Assert
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
      expect(user.email).toBe(testUser.email);
      expect(user.role).toBe(testUser.role);
    });

    it('should return null for unknown auth0_id in config mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'true';
      process.env.NODE_ENV = 'development';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();

      // Act
      const user = await service.getUserByAuth0Id('unknown|12345');

      // Assert
      expect(user).toBeNull();
    });

    it('should query database by auth0_id in production mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'false';
      process.env.NODE_ENV = 'production';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();
      const mockUser = { id: 1, auth0_id: 'auth0|123', email: 'test@example.com' };
      User.findByAuth0Id.mockResolvedValue(mockUser);

      // Act
      const user = await service.getUserByAuth0Id('auth0|123');

      // Assert
      expect(User.findByAuth0Id).toHaveBeenCalledWith('auth0|123');
      expect(user).toEqual(mockUser);
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing test user in config mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'true';
      process.env.NODE_ENV = 'development';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();
      const testUser = Object.values(TEST_USERS)[0];
      const auth0Data = { sub: testUser.auth0_id };

      // Act
      const user = await service.findOrCreateUser(auth0Data);

      // Assert
      expect(user).toBeDefined();
      expect(user.auth0_id).toBe(testUser.auth0_id);
    });

    it('should call User.findOrCreate in production mode', async () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'false';
      process.env.NODE_ENV = 'production';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();
      const auth0Data = { sub: 'auth0|123', email: 'new@example.com' };
      const mockUser = { id: 1, auth0_id: 'auth0|123' };
      User.findOrCreate.mockResolvedValue(mockUser);

      // Act
      const user = await service.findOrCreateUser(auth0Data);

      // Assert
      expect(User.findOrCreate).toHaveBeenCalledWith(auth0Data);
      expect(user).toEqual(mockUser);
    });
  });

  describe('isConfigMode', () => {
    it('should return true when USE_TEST_AUTH=true and NODE_ENV=development', () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'true';
      process.env.NODE_ENV = 'development';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();

      // Act & Assert
      expect(service.isConfigMode()).toBe(true);
    });

    it('should return false in production', () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'false';
      process.env.NODE_ENV = 'production';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();

      // Act & Assert
      expect(service.isConfigMode()).toBe(false);
    });

    it('should return false when USE_TEST_AUTH=false even in development', () => {
      // Arrange
      process.env.USE_TEST_AUTH = 'false';
      process.env.NODE_ENV = 'development';
      const service = new (require('../../../services/user-data').UserDataService.constructor)();

      // Act & Assert
      expect(service.isConfigMode()).toBe(false);
    });
  });
});
