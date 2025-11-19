/**
 * E2E Test Constants
 * 
 * Single source of truth for E2E test data.
 * Imports from root config services where possible (SRP).
 * 
 * Architecture:
 * - URLs: Import from config/ports.js
 * - Test data: Centralized here with valid formats
 * - Error messages: Import from backend/config/test-constants.js
 */

// URLs from root config (SRP - single source of truth)
const PORTS = require('../../config/ports');

export const URLS = {
  BACKEND: PORTS.BACKEND_URL,
  FRONTEND: PORTS.FRONTEND_URL,
  API: PORTS.BACKEND_API_URL,
  HEALTH: PORTS.BACKEND_HEALTH_URL,
} as const;

// Valid test data (E.164 phone format, unique identifiers)
export const TEST_DATA = {
  // Phone numbers in E.164 international format (validation requirement)
  PHONES: {
    CUSTOMER: '+15550100',
    TECHNICIAN: '+15550101',
    MANAGER: '+15550102',
    ADMIN: '+15550103',
  },

  // Email domain for E2E tests
  EMAIL: {
    DOMAIN: '@e2etest.trossapp.dev',
    
    // Helper to generate unique email
    unique: (prefix: string) => `${prefix}-${Date.now()}@e2etest.trossapp.dev`,
  },

  // Prefixes for test entity names (ensures cleanup works)
  PREFIXES: {
    USER: 'e2e-test',
    ROLE: 'e2e-test-role',
    CUSTOMER: 'e2e-customer',
    TECHNICIAN: 'e2e-tech',
    INVENTORY: 'E2E-SKU',
    CONTRACT: 'E2E-CNT',
    INVOICE: 'E2E-INV',
    LICENSE: 'E2E-LIC',
    WORK_ORDER: 'E2E-WO',
  },

  // Sample business entity data (valid formats)
  CUSTOMER: {
    company_name: 'E2E Test Company',
    contact_name: 'Test Contact',
  },

  TECHNICIAN: {
    first_name: 'John',
    last_name: 'Technician',
    hourly_rate: 85.00,
    status: 'available' as const,
  },

  INVENTORY: {
    name_prefix: 'E2E Test Part',
    quantity: 100,
    unit_cost: 25.50,
    location: 'Warehouse A',
  },

  CONTRACT: {
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    value: 12000.00,
    status: 'active' as const,
  },

  WORK_ORDER: {
    title: 'E2E HVAC Repair',
    description: 'End-to-end test work order',
    priority: 'high' as const,
    status: 'pending' as const,
  },

  INVOICE: {
    amount: 850.00,
    tax: 68.00,
    total: 918.00,
    status: 'draft' as const,
    due_date: '2024-12-31',
  },
} as const;

// User test data templates
export const TEST_USERS = {
  TEMPLATES: {
    BASIC: {
      first_name: 'TestUser',
      last_name: 'EndToEnd',
    },
    FOR_ERROR: {
      first_name: 'TestUser',
      last_name: 'ForError',
    },
    DUPLICATE_FIRST: {
      first_name: 'First',
      last_name: 'User',
    },
    DUPLICATE_SECOND: {
      first_name: 'Second',
      last_name: 'User',
    },
  },
  
  // Invalid data for validation testing
  INVALID: {
    EMAIL: 'not-an-email',
    FIRST_NAME: '123',
    PHONE: '555-0100', // Missing E.164 format
  },
} as const;

// Role test data
export const TEST_ROLES = {
  TEMPLATES: {
    BASIC: {
      priority: 100,
      description: 'E2E test role',
    },
    UPDATED: {
      description: 'Updated E2E test role',
    },
  },
} as const;

// Cleanup patterns (what to delete after tests)
export const CLEANUP = {
  EMAIL_PATTERN: 'e2e-test',
  ROLE_PATTERN: 'e2e-test-role',
} as const;
