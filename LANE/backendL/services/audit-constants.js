/**
 * Audit Action Constants
 * Centralized definitions for all audit log actions
 */

const AuditActions = {
  // Authentication actions
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  TOKEN_REFRESH: 'token_refresh',
  PASSWORD_RESET: 'password_reset',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',

  // User management actions
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_DEACTIVATE: 'user_deactivate',
  USER_REACTIVATE: 'user_reactivate',

  // Role management actions
  ROLE_CREATE: 'role_create',
  ROLE_UPDATE: 'role_update',
  ROLE_DELETE: 'role_delete',
  ROLE_DEACTIVATE: 'role_deactivate',
  ROLE_REACTIVATE: 'role_reactivate',
  ROLE_ASSIGN: 'role_assign',
  ROLE_REMOVE: 'role_remove',
  ROLE_CHANGE: 'role_change',
};

const ResourceTypes = {
  AUTH: 'auth',
  USER: 'user',
  ROLE: 'role',
};

const AuditResults = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'error',
};

module.exports = {
  AuditActions,
  ResourceTypes,
  AuditResults,
};
