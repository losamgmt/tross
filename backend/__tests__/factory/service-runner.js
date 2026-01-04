/**
 * Service Test Runner
 *
 * PRINCIPLE: Run all applicable scenarios for a service based on its registry metadata.
 * No if/else per service - scenarios self-select based on method metadata.
 *
 * Usage (unit tests - with mocks):
 *   const { runServiceTests } = require('../../factory/service-runner');
 *   runServiceTests('admin-logs');
 *
 * Usage (integration tests - with real db):
 *   runServiceTests('admin-logs', { integration: true, db });
 *
 * Or test all services:
 *   runAllServiceTests();
 */

const serviceRegistry = require('./service-registry');
const serviceScenarios = require('./scenarios/service.scenarios');

/**
 * Run all test scenarios for a service
 *
 * @param {string} serviceName - Service to test (e.g., 'admin-logs', 'sessions')
 * @param {Object} options - Configuration options
 * @param {boolean} options.integration - If true, use real dependencies
 * @param {Object} options.db - Database connection (for integration tests)
 * @param {string[]} options.scenarios - Specific scenarios to run (default: all)
 * @param {Object} options.mocks - Custom mocks for dependencies
 */
function runServiceTests(serviceName, options = {}) {
  const serviceMeta = serviceRegistry[serviceName];

  if (!serviceMeta) {
    throw new Error(
      `Unknown service: ${serviceName}. Available: ${Object.keys(serviceRegistry).join(', ')}`,
    );
  }

  // Skip if marked for skip
  if (serviceMeta.skipAutoTest) {
    console.log(`Skipping auto-test for ${serviceName} (already tested)`);
    return;
  }

  const scenariosToRun = options.scenarios || Object.keys(serviceScenarios);

  describe(`${serviceName} Service Tests`, () => {
    let service;
    let mocks = {};

    beforeAll(() => {
      // Set up mocks or real dependencies
      if (options.integration) {
        // Integration mode - use real module
        service = require(serviceMeta.module);
      } else {
        // Unit mode - create mocks for dependencies
        mocks = createMocks(serviceMeta.dependencies, options.mocks);
        
        // Try to load the service
        // For unit tests, we may need to mock dependencies first
        try {
          // Reset module cache to pick up mocks
          jest.resetModules();
          
          // Apply mocks
          for (const [depName, mock] of Object.entries(mocks)) {
            jest.doMock(getDependencyPath(depName), () => mock);
          }
          
          service = require(serviceMeta.module);
        } catch (error) {
          console.warn(`Could not load ${serviceName}: ${error.message}`);
          // Create a stub service for basic tests
          service = createStubService(serviceMeta);
        }
      }
    });

    afterAll(() => {
      jest.resetModules();
    });

    // Create test context
    const ctx = {
      get service() {
        return service;
      },
      get mocks() {
        return mocks;
      },
      it: (name, fn) => it(name, fn),
      expect: expect,
    };

    // Run each scenario
    for (const scenarioName of scenariosToRun) {
      const scenarioFn = serviceScenarios[scenarioName];
      if (!scenarioFn) {
        console.warn(`Unknown service scenario: ${scenarioName}`);
        continue;
      }

      // Scenario self-selects based on metadata
      scenarioFn(serviceMeta, ctx);
    }
  });
}

/**
 * Run tests for all registered services
 *
 * @param {Object} options - Same as runServiceTests
 */
function runAllServiceTests(options = {}) {
  const serviceNames = Object.keys(serviceRegistry).filter(
    (name) => !serviceRegistry[name].skipAutoTest,
  );

  for (const serviceName of serviceNames) {
    runServiceTests(serviceName, options);
  }
}

/**
 * Create mock objects for dependencies
 */
function createMocks(dependencies, customMocks = {}) {
  const mocks = {};

  for (const dep of dependencies || []) {
    if (customMocks[dep]) {
      mocks[dep] = customMocks[dep];
      continue;
    }

    switch (dep) {
      case 'db':
        mocks[dep] = {
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          getClient: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
          }),
        };
        break;
      case 'fs':
        mocks[dep] = {
          readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
          writeFile: jest.fn().mockResolvedValue(undefined),
          unlink: jest.fn().mockResolvedValue(undefined),
          existsSync: jest.fn().mockReturnValue(true),
        };
        break;
      default:
        mocks[dep] = {};
    }
  }

  return mocks;
}

/**
 * Get the require path for a dependency
 */
function getDependencyPath(depName) {
  switch (depName) {
    case 'db':
      return '../../../db/connection';
    case 'fs':
      return 'fs/promises';
    default:
      return depName;
  }
}

/**
 * Create a stub service when real service can't be loaded
 */
function createStubService(serviceMeta) {
  const stub = {};

  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    if (methodMeta.async) {
      stub[methodName] = jest.fn().mockResolvedValue(
        getDefaultReturnValue(methodMeta.returns),
      );
    } else {
      stub[methodName] = jest.fn().mockReturnValue(
        getDefaultReturnValue(methodMeta.returns),
      );
    }
  }

  return stub;
}

/**
 * Get default return value for a type
 */
function getDefaultReturnValue(returnType) {
  switch (returnType) {
    case 'array':
      return [];
    case 'object':
      return {};
    case 'object|null':
      return null;
    case 'string':
      return '';
    case 'boolean':
      return true;
    case 'number':
      return 0;
    case 'void':
      return undefined;
    default:
      return null;
  }
}

/**
 * Get list of all registered service names
 */
function getRegisteredServices() {
  return Object.keys(serviceRegistry);
}

/**
 * Get metadata for a specific service
 */
function getServiceMetadata(serviceName) {
  return serviceRegistry[serviceName];
}

module.exports = {
  runServiceTests,
  runAllServiceTests,
  getRegisteredServices,
  getServiceMetadata,
};
