/**
 * Model Mock Factory
 * 
 * SRP: ONLY mocks model behavior (User, Role, etc.)
 * Use: Import and apply in test files
 */

const { MOCK_USERS, ACTIVE_USERS, ALL_USERS, MOCK_USERS_WITH_ROLES } = require("../fixtures/users");
const { MOCK_ROLES, ACTIVE_ROLES, ALL_ROLES } = require("../fixtures/roles");

/**
 * Create a mock User model
 * 
 * @returns {Object} Mocked User model with all CRUD methods
 */
function createMockUser() {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByAuth0Id: jest.fn(),
    findByEmail: jest.fn(),
  };
}

/**
 * Create a mock Role model
 * 
 * @returns {Object} Mocked Role model with all CRUD methods
 */
function createMockRole() {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByName: jest.fn(),
  };
}

/**
 * Standard jest.mock() configuration for User model
 */
const USER_MOCK_CONFIG = () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByAuth0Id: jest.fn(),
  findByEmail: jest.fn(),
});

/**
 * Standard jest.mock() configuration for Role model
 */
const ROLE_MOCK_CONFIG = () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByName: jest.fn(),
});

/**
 * Reset all User model mocks
 * 
 * @param {Object} User - User model mock instance
 */
function resetUserMocks(User) {
  User.findById.mockReset();
  User.findAll.mockReset();
  User.create.mockReset();
  User.update.mockReset();
  User.delete.mockReset();
  User.findByAuth0Id.mockReset();
  User.findByEmail.mockReset();
}

/**
 * Reset all Role model mocks
 * 
 * @param {Object} Role - Role model mock instance
 */
function resetRoleMocks(Role) {
  Role.findById.mockReset();
  Role.findAll.mockReset();
  Role.create.mockReset();
  Role.update.mockReset();
  Role.delete.mockReset();
  Role.findByName.mockReset();
}

/**
 * Mock User.findById to return specific user
 * 
 * @param {Object} User - User model mock
 * @param {Object} user - User fixture to return (default: MOCK_USERS.admin)
 */
function mockUserFindById(User, user = MOCK_USERS.admin) {
  User.findById.mockResolvedValue(user);
}

/**
 * Mock User.findAll to return active users
 * 
 * @param {Object} User - User model mock
 * @param {Array} users - User fixtures to return (default: ACTIVE_USERS)
 */
function mockUserFindAll(User, users = ACTIVE_USERS) {
  User.findAll.mockResolvedValue(users);
}

/**
 * Mock User.create to return created user
 * 
 * @param {Object} User - User model mock
 * @param {Object} user - User fixture to return (default: MOCK_USERS.client)
 */
function mockUserCreate(User, user = MOCK_USERS.client) {
  User.create.mockResolvedValue(user);
}

/**
 * Mock User.update to return updated user
 * 
 * @param {Object} User - User model mock
 * @param {Object} user - User fixture to return (default: MOCK_USERS.admin)
 */
function mockUserUpdate(User, user = MOCK_USERS.admin) {
  User.update.mockResolvedValue(user);
}

/**
 * Mock User.delete to return deleted user
 * 
 * @param {Object} User - User model mock
 * @param {Object} user - User fixture to return (default: MOCK_USERS.inactive)
 */
function mockUserDelete(User, user = MOCK_USERS.inactive) {
  User.delete.mockResolvedValue(user);
}

/**
 * Mock User.findByAuth0Id to return specific user
 * 
 * @param {Object} User - User model mock
 * @param {Object} user - User fixture to return (default: MOCK_USERS.admin)
 */
function mockUserFindByAuth0Id(User, user = MOCK_USERS.admin) {
  User.findByAuth0Id.mockResolvedValue(user);
}

/**
 * Mock User.findByEmail to return specific user
 * 
 * @param {Object} User - User model mock
 * @param {Object} user - User fixture to return (default: MOCK_USERS.admin)
 */
function mockUserFindByEmail(User, user = MOCK_USERS.admin) {
  User.findByEmail.mockResolvedValue(user);
}

/**
 * Mock Role.findById to return specific role
 * 
 * @param {Object} Role - Role model mock
 * @param {Object} role - Role fixture to return (default: MOCK_ROLES.admin)
 */
function mockRoleFindById(Role, role = MOCK_ROLES.admin) {
  Role.findById.mockResolvedValue(role);
}

/**
 * Mock Role.findAll to return active roles
 * 
 * @param {Object} Role - Role model mock
 * @param {Array} roles - Role fixtures to return (default: ACTIVE_ROLES)
 */
function mockRoleFindAll(Role, roles = ACTIVE_ROLES) {
  Role.findAll.mockResolvedValue(roles);
}

/**
 * Mock Role.findByName to return specific role
 * 
 * @param {Object} Role - Role model mock
 * @param {Object} role - Role fixture to return (default: MOCK_ROLES.admin)
 */
function mockRoleFindByName(Role, role = MOCK_ROLES.admin) {
  Role.findByName.mockResolvedValue(role);
}

/**
 * Mock Role.create to return created role
 * 
 * @param {Object} Role - Role model mock
 * @param {Object} role - Role fixture to return
 */
function mockRoleCreate(Role, role) {
  Role.create.mockResolvedValue(role);
}

/**
 * Mock Role.update to return updated role
 * 
 * @param {Object} Role - Role model mock
 * @param {Object} role - Role fixture to return
 */
function mockRoleUpdate(Role, role) {
  Role.update.mockResolvedValue(role);
}

/**
 * Mock Role.delete to return deleted role
 * 
 * @param {Object} Role - Role model mock
 * @param {Object} role - Role fixture to return
 */
function mockRoleDelete(Role, role) {
  Role.delete.mockResolvedValue(role);
}

module.exports = {
  // Factory functions
  createMockUser,
  createMockRole,
  
  // jest.mock() configs
  USER_MOCK_CONFIG,
  ROLE_MOCK_CONFIG,
  
  // Reset helpers
  resetUserMocks,
  resetRoleMocks,
  
  // User mock helpers
  mockUserFindById,
  mockUserFindAll,
  mockUserCreate,
  mockUserUpdate,
  mockUserDelete,
  mockUserFindByAuth0Id,
  mockUserFindByEmail,
  
  // Role mock helpers
  mockRoleFindById,
  mockRoleFindAll,
  mockRoleFindByName,
  mockRoleCreate,
  mockRoleUpdate,
  mockRoleDelete,
};
