/**
 * Test Fixtures Index
 * 
 * Central export point for all mock DATA
 * SRP: ONLY data, no behavior
 */

const { MOCK_ROLES, ACTIVE_ROLES, ALL_ROLES, PROTECTED_ROLES } = require("./roles");
const { MOCK_USERS, MOCK_USERS_WITH_ROLES, ACTIVE_USERS, ALL_USERS } = require("./users");
const { PAGINATION_RESULTS, EMPTY_RESULT, createQueryResult } = require("./database");

module.exports = {
  // Roles
  MOCK_ROLES,
  ACTIVE_ROLES,
  ALL_ROLES,
  PROTECTED_ROLES,

  // Users
  MOCK_USERS,
  MOCK_USERS_WITH_ROLES,
  ACTIVE_USERS,
  ALL_USERS,

  // Database results
  PAGINATION_RESULTS,
  EMPTY_RESULT,
  createQueryResult,
};
