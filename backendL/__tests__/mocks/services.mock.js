/**
 * Service Mock Factory
 * 
 * SRP: ONLY mocks service behavior (AuditService, TokenService, etc.)
 * Use: Import and apply in test files
 */

/**
 * Create a mock AuditService
 * 
 * @returns {Object} Mocked AuditService with all methods
 */
function createMockAuditService() {
  return {
    log: jest.fn(),
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logAuth: jest.fn(),
    logError: jest.fn(),
  };
}

/**
 * Create a mock TokenService
 * 
 * @returns {Object} Mocked TokenService with all methods
 */
function createMockTokenService() {
  return {
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
    refreshToken: jest.fn(),
    revokeToken: jest.fn(),
  };
}

/**
 * Create a mock PaginationService
 * 
 * @returns {Object} Mocked PaginationService with all methods
 */
function createMockPaginationService() {
  return {
    validateParams: jest.fn(),
    generateMetadata: jest.fn(),
    buildLimitClause: jest.fn(),
    paginate: jest.fn(),
  };
}

/**
 * Create a mock UserDataService
 * 
 * @returns {Object} Mocked UserDataService with all methods
 */
function createMockUserDataService() {
  return {
    getAllUsers: jest.fn(),
    getUserByAuth0Id: jest.fn(),
    findOrCreateUser: jest.fn(),
    isConfigMode: jest.fn(),
  };
}

/**
 * Standard jest.mock() configuration for AuditService
 */
const AUDIT_SERVICE_MOCK_CONFIG = () => ({
  log: jest.fn(),
  logCreate: jest.fn(),
  logUpdate: jest.fn(),
  logDelete: jest.fn(),
  logAuth: jest.fn(),
  logError: jest.fn(),
});

/**
 * Standard jest.mock() configuration for TokenService
 */
const TOKEN_SERVICE_MOCK_CONFIG = () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
  refreshToken: jest.fn(),
  revokeToken: jest.fn(),
});

/**
 * Standard jest.mock() configuration for PaginationService
 */
const PAGINATION_SERVICE_MOCK_CONFIG = () => ({
  validateParams: jest.fn(),
  generateMetadata: jest.fn(),
  buildLimitClause: jest.fn(),
  paginate: jest.fn(),
});

/**
 * Standard jest.mock() configuration for UserDataService
 */
const USER_DATA_SERVICE_MOCK_CONFIG = () => ({
  getAllUsers: jest.fn(),
  getUserByAuth0Id: jest.fn(),
  findOrCreateUser: jest.fn(),
  isConfigMode: jest.fn(),
});

/**
 * Reset all AuditService mocks
 * 
 * @param {Object} auditService - AuditService mock instance
 */
function resetAuditServiceMocks(auditService) {
  auditService.log.mockReset();
  auditService.logCreate.mockReset();
  auditService.logUpdate.mockReset();
  auditService.logDelete.mockReset();
  auditService.logAuth.mockReset();
  auditService.logError.mockReset();
}

/**
 * Reset all TokenService mocks
 * 
 * @param {Object} tokenService - TokenService mock instance
 */
function resetTokenServiceMocks(tokenService) {
  tokenService.generateToken.mockReset();
  tokenService.verifyToken.mockReset();
  tokenService.refreshToken.mockReset();
  tokenService.revokeToken.mockReset();
}

/**
 * Reset all UserDataService mocks
 * 
 * @param {Object} userDataService - UserDataService mock instance
 */
function resetUserDataServiceMocks(userDataService) {
  userDataService.getAllUsers.mockReset();
  userDataService.getUserByAuth0Id.mockReset();
  userDataService.findOrCreateUser.mockReset();
  userDataService.isConfigMode.mockReset();
}

/**
 * Reset all PaginationService mocks
 * 
 * @param {Object} paginationService - PaginationService mock instance
 */
function resetPaginationServiceMocks(paginationService) {
  paginationService.validateParams.mockReset();
  paginationService.generateMetadata.mockReset();
  paginationService.buildLimitClause.mockReset();
  paginationService.paginate.mockReset();
}

/**
 * Mock AuditService.log to resolve successfully
 * 
 * @param {Object} auditService - AuditService mock
 */
function mockAuditLog(auditService) {
  auditService.log.mockResolvedValue(undefined);
}

/**
 * Mock AuditService.logCreate to resolve successfully
 * 
 * @param {Object} auditService - AuditService mock
 */
function mockAuditLogCreate(auditService) {
  auditService.logCreate.mockResolvedValue(undefined);
}

/**
 * Mock AuditService.logUpdate to resolve successfully
 * 
 * @param {Object} auditService - AuditService mock
 */
function mockAuditLogUpdate(auditService) {
  auditService.logUpdate.mockResolvedValue(undefined);
}

/**
 * Mock AuditService.logDelete to resolve successfully
 * 
 * @param {Object} auditService - AuditService mock
 */
function mockAuditLogDelete(auditService) {
  auditService.logDelete.mockResolvedValue(undefined);
}

/**
 * Mock AuditService.logAuth to resolve successfully
 * 
 * @param {Object} auditService - AuditService mock
 */
function mockAuditLogAuth(auditService) {
  auditService.logAuth.mockResolvedValue(undefined);
}

/**
 * Mock all AuditService methods to resolve successfully
 * 
 * @param {Object} auditService - AuditService mock
 */
function mockAuditServiceSuccess(auditService) {
  mockAuditLog(auditService);
  mockAuditLogCreate(auditService);
  mockAuditLogUpdate(auditService);
  mockAuditLogDelete(auditService);
  mockAuditLogAuth(auditService);
  auditService.logError.mockResolvedValue(undefined);
}

/**
 * Mock PaginationService.paginate to return standard result
 * 
 * @param {Object} paginationService - PaginationService mock
 * @param {Object} result - Pagination result to return
 */
function mockPaginationServicePaginate(paginationService, result = {
  params: { page: 1, limit: 50, offset: 0 },
  metadata: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
}) {
  paginationService.paginate.mockReturnValue(result);
}

/**
 * Mock PaginationService.validateParams to return standard params
 * 
 * @param {Object} paginationService - PaginationService mock
 * @param {Object} params - Params to return
 */
function mockPaginationServiceValidateParams(paginationService, params = { page: 1, limit: 50, offset: 0 }) {
  paginationService.validateParams.mockReturnValue(params);
}

/**
 * Mock PaginationService.generateMetadata to return standard metadata
 * 
 * @param {Object} paginationService - PaginationService mock
 * @param {Object} metadata - Metadata to return
 */
function mockPaginationServiceGenerateMetadata(paginationService, metadata = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
}) {
  paginationService.generateMetadata.mockReturnValue(metadata);
}

/**
 * Mock PaginationService.buildLimitClause to return SQL string
 * 
 * @param {Object} paginationService - PaginationService mock
 * @param {string} clause - SQL clause to return
 */
function mockPaginationServiceBuildLimitClause(paginationService, clause = "LIMIT 50 OFFSET 0") {
  paginationService.buildLimitClause.mockReturnValue(clause);
}

/**
 * Mock UserDataService.findOrCreateUser to return a user
 * 
 * @param {Object} userDataService - UserDataService mock
 * @param {Object} user - User object to return (defaults to auth0 user)
 */
function mockUserDataServiceFindOrCreateUser(userDataService, user = {
  id: 1,
  auth0_id: "auth0|12345",
  email: "user@auth0.com",
  first_name: "Test",
  last_name: "User",
  role: "technician",
  is_active: true,
  provider: "auth0",
  name: "Test User",
}) {
  userDataService.findOrCreateUser.mockResolvedValue(user);
}

/**
 * Mock UserDataService.getUserByAuth0Id to return a user
 * 
 * @param {Object} userDataService - UserDataService mock
 * @param {Object} user - User object to return
 */
function mockUserDataServiceGetUserByAuth0Id(userDataService, user) {
  userDataService.getUserByAuth0Id.mockResolvedValue(user);
}

/**
 * Create a mock Auth0Auth Service
 * 
 * @returns {Object} Mocked Auth0Auth with all methods
 */
function createMockAuth0Service() {
  return {
    getProviderName: jest.fn().mockReturnValue('auth0'),
    authenticate: jest.fn(),
    verifyToken: jest.fn(),
    getUserProfile: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getAuthorizationUrl: jest.fn(),
    getLogoutUrl: jest.fn(),
    createAdminUser: jest.fn(),
    authClient: {
      users: {
        getInfo: jest.fn()
      },
      buildAuthorizeUrl: jest.fn(),
      oauth: {
        refreshToken: jest.fn()
      }
    },
    managementClient: {
      createUser: jest.fn()
    }
  };
}

/**
 * Reset all Auth0Service mocks
 * 
 * @param {Object} auth0Service - Auth0Service mock instance
 */
function resetAuth0ServiceMocks(auth0Service) {
  auth0Service.getProviderName.mockReset();
  auth0Service.authenticate.mockReset();
  auth0Service.verifyToken.mockReset();
  auth0Service.getUserProfile.mockReset();
  auth0Service.refreshToken.mockReset();
  auth0Service.logout.mockReset();
  auth0Service.getAuthorizationUrl.mockReset();
  auth0Service.getLogoutUrl.mockReset();
  auth0Service.createAdminUser.mockReset();
  auth0Service.authClient.users.getInfo.mockReset();
  auth0Service.authClient.buildAuthorizeUrl.mockReset();
  auth0Service.authClient.oauth.refreshToken.mockReset();
  auth0Service.managementClient.createUser.mockReset();
}

module.exports = {
  // Factory functions
  createMockAuditService,
  createMockTokenService,
  createMockPaginationService,
  createMockUserDataService,
  createMockAuth0Service,
  
  // jest.mock() configs
  AUDIT_SERVICE_MOCK_CONFIG,
  TOKEN_SERVICE_MOCK_CONFIG,
  PAGINATION_SERVICE_MOCK_CONFIG,
  USER_DATA_SERVICE_MOCK_CONFIG,
  
  // Reset helpers
  resetAuditServiceMocks,
  resetTokenServiceMocks,
  resetPaginationServiceMocks,
  resetUserDataServiceMocks,
  resetAuth0ServiceMocks,
  
  // AuditService mock helpers
  mockAuditLog,
  mockAuditLogCreate,
  mockAuditLogUpdate,
  mockAuditLogDelete,
  mockAuditLogAuth,
  mockAuditServiceSuccess,
  
  // PaginationService mock helpers
  mockPaginationServicePaginate,
  mockPaginationServiceValidateParams,
  mockPaginationServiceGenerateMetadata,
  mockPaginationServiceBuildLimitClause,
  
  // UserDataService mock helpers
  mockUserDataServiceFindOrCreateUser,
  mockUserDataServiceGetUserByAuth0Id,
};
