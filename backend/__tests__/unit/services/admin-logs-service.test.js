/**
 * Admin Logs Service - Unit Tests
 *
 * Uses the service runner pattern to test the admin-logs service.
 * Tests are generated from service-registry.js metadata.
 *
 * PRINCIPLE: No hardcoded tests - all derived from service metadata.
 */

const { runServiceTests } = require('../../factory/service-runner');

// Run all service scenarios for admin-logs
runServiceTests('admin-logs');
