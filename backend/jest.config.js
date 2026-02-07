/**
 * Jest Configuration - Main Config (Unit + Integration)
 *
 * Uses coverage-standards.js as SSOT for thresholds and patterns.
 */

const {
  coverageThreshold,
  collectCoverageFrom,
  coveragePathIgnorePatterns,
} = require("./config/coverage-standards");

module.exports = {
  testEnvironment: "node",
  maxWorkers: 1,
  bail: 1,
  verbose: true,

  // Run both unit and integration tests
  projects: [
    {
      displayName: "unit",
      testMatch: ["**/__tests__/unit/**/*.test.js"],
      setupFilesAfterEnv: ["<rootDir>/__tests__/setup/jest.setup.js"],
      testTimeout: 5000,
      maxWorkers: 1,
    },
    {
      displayName: "integration",
      testMatch: ["**/__tests__/integration/**/*.test.js"],
      setupFilesAfterEnv: [
        "<rootDir>/__tests__/setup/jest.integration.setup.js",
      ],
      globalSetup: "<rootDir>/__tests__/setup/jest.global.setup.js",
      globalTeardown: "<rootDir>/__tests__/setup/jest.integration.teardown.js",
      testTimeout: 10000,
      maxWorkers: 1,
    },
  ],

  // Coverage configuration from SSOT
  collectCoverageFrom,
  coveragePathIgnorePatterns,
  coverageThreshold,
  coverageReporters: ["text", "lcov", "html", "json-summary"],

  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/fixtures/",
    "/__tests__/helpers/",
    "/__tests__/setup/",
  ],

  forceExit: true,
  detectOpenHandles: true,
};
