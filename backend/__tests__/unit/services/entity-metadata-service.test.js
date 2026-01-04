/**
 * Entity Metadata Service - Unit Tests
 *
 * Uses the service runner pattern to test the entity-metadata service.
 * Tests are generated from service-registry.js metadata.
 *
 * PRINCIPLE: No hardcoded tests - all derived from service metadata.
 */

const { runServiceTests } = require('../../factory/service-runner');

// Run all service scenarios for entity-metadata
runServiceTests('entity-metadata');
