# Service Layer Standards

This document defines the standard patterns for all services in the `backend/services/` directory.

## Quick Reference

```javascript
// Standard service structure
const db = require('../db/connection');
const { logger } = require('../config/logger');
const AppError = require('../utils/app-error');

class ExampleService {
  // Business methods...

  // Health check methods (required)
  static isConfigured() { /* ... */ }
  static getConfigurationInfo() { /* ... */ }
  static async healthCheck(timeoutMs = 5000) { /* ... */ }
}

module.exports = ExampleService;
```

## Directory Structure

```
backend/services/
├── auth/                      # Auth strategy implementations
│   ├── Auth0Strategy.js       # Auth0 OAuth strategy
│   └── DevTokenStrategy.js    # Development token strategy
├── auth-user-service.js       # User authentication operations
├── audit-service.js           # Audit logging
├── export-service.js          # Data export (CSV, JSON)
├── file-attachment-service.js # File attachment DB operations
├── generic-entity-service.js  # Metadata-driven CRUD
├── idempotency-service.js     # Idempotency key management
├── integration-token-service.js # OAuth token storage for integrations
├── pagination-service.js      # Query pagination helpers
├── parent-rls-service.js      # Parent entity RLS (deprecated)
├── query-builder-service.js   # Dynamic query building
├── sessions-service.js        # Session management for admins
├── stats-service.js           # Dashboard statistics
├── storage-service.js         # Cloud storage (R2/S3)
├── system-settings-service.js # System configuration
├── token-service.js           # JWT token lifecycle
└── user-data.js               # DEPRECATED: Use auth-user-service.js
```

## Standard Patterns

### 1. Module Structure

All services MUST follow this structure:

```javascript
/**
 * ServiceName - Brief description
 *
 * SRP: Describe the single responsibility
 *
 * DESIGN:
 * - Key design decisions
 * - Dependencies and relationships
 *
 * USAGE:
 *   const result = await ServiceName.method(params);
 */

// 1. Imports (in order)
const db = require('../db/connection');           // Database (if needed)
const { logger } = require('../config/logger');   // Logging
const AppError = require('../utils/app-error');   // Error handling
// ... other imports

// 2. Constants (if any)
const SOME_CONSTANT = 'value';

// 3. Class definition
class ServiceName {
  // Business methods...

  // Health check methods (REQUIRED)
  static isConfigured() { /* ... */ }
  static getConfigurationInfo() { /* ... */ }
  static async healthCheck(timeoutMs = 5000) { /* ... */ }
}

// 4. Export
module.exports = ServiceName;
```

### 2. Database Access Pattern

**REQUIRED:** Use `db.query()` for all database operations.

```javascript
// ✅ CORRECT - Standard pattern
const db = require('../db/connection');
const result = await db.query('SELECT * FROM table WHERE id = $1', [id]);

// ❌ WRONG - Destructured import
const { query: db } = require('../db/connection');
await db('SELECT ...');  // Don't do this

// ❌ WRONG - Direct pool access
const { pool } = require('../db/connection');
await pool.query('SELECT ...');  // Don't do this
```

### 3. Health Check Pattern

All services that interact with external resources (DB, APIs, storage) MUST implement these methods:

```javascript
class ServiceName {
  /**
   * Check if service is configured (no network call)
   * @returns {boolean}
   */
  static isConfigured() {
    // Return true if all required config is present
    // Example: check for required env vars or dependencies
    return true;
  }

  /**
   * Get configuration info (no network call)
   * @returns {Object} Configuration status object
   */
  static getConfigurationInfo() {
    return {
      configured: this.isConfigured(),
      // Add service-specific info
    };
  }

  /**
   * Deep health check - actually pings the resource
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns {Promise<Object>} Health check result
   */
  static async healthCheck(timeoutMs = 5000) {
    const start = Date.now();

    if (!this.isConfigured()) {
      return {
        configured: false,
        reachable: false,
        responseTime: 0,
        status: 'unconfigured',
        message: 'Service not configured',
      };
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timed out')), timeoutMs);
      });

      // Test actual connectivity
      const queryPromise = db.query('SELECT 1');

      await Promise.race([queryPromise, timeoutPromise]);
      const responseTime = Date.now() - start;

      return {
        configured: true,
        reachable: true,
        responseTime,
        status: 'healthy',
      };
    } catch (error) {
      const responseTime = Date.now() - start;

      return {
        configured: true,
        reachable: false,
        responseTime,
        status: error.message?.includes('timed out') ? 'timeout' : 'critical',
        message: error.message,
      };
    }
  }
}
```

### 4. Error Handling Pattern

Use `AppError` for business errors with proper HTTP status codes:

```javascript
const AppError = require('../utils/app-error');

// Validation errors (400)
throw new AppError('Email is required', 400, 'BAD_REQUEST');

// Not found (404)
throw new AppError('User not found', 404, 'NOT_FOUND');

// Permission denied (403)
throw new AppError('Access denied', 403, 'FORBIDDEN');

// Internal errors (500)
throw new AppError('Failed to process', 500, 'INTERNAL_ERROR');
```

### 5. Logging Pattern

Use the logger for all service events:

```javascript
const { logger } = require('../config/logger');

// Debug (development only)
logger.debug('Operation details', { param1, param2 });

// Info (important operations)
logger.info('User created', { userId, email });

// Warning (unexpected but handled)
logger.warn('Rate limit approaching', { userId, requestCount });

// Error (failures)
logger.error('Database failed', { error: error.message, stack: error.stack });
```

### 6. Static Class vs Instance

**Use static class** for services that:
- Have no instance state
- Are used as singletons
- Don't need lazy initialization

```javascript
// ✅ RECOMMENDED - Static class
class ServiceName {
  static async method() { /* ... */ }
}
module.exports = ServiceName;
```

**Use instance + lazy init** for services that:
- Hold expensive connections
- Need initialization on first use
- Have configurable state

```javascript
// Instance pattern (like StorageService)
class StorageService {
  constructor() { /* ... */ }
  async upload() { /* ... */ }
}

let instance = null;
const getInstance = () => {
  if (!instance) instance = new StorageService();
  return instance;
};

module.exports = { storageService: getInstance(), StorageService };
```

## Service Responsibility Guide

| Service | Responsibility | Pattern |
|---------|---------------|---------|
| `generic-entity-service` | Metadata-driven CRUD for all entities | Static class |
| `auth-user-service` | Auth0 user operations + user data | Static class |
| `token-service` | JWT token pair management | Static class |
| `audit-service` | Audit log writing and queries | Static class |
| `storage-service` | File upload/download to R2 | Singleton |
| `system-settings-service` | System config, feature flags | Static class |
| `integration-token-service` | OAuth tokens for QuickBooks/Stripe | Static class |
| `sessions-service` | Admin session management | Static class |
| `file-attachment-service` | File attachment DB records | Static class |

## Deprecated Services

### user-data.js

**Status:** Deprecated wrapper  
**Replacement:** `auth-user-service.js`  
**Migration:**
```javascript
// Old
const UserDataService = require('./user-data');

// New
const AuthUserService = require('./auth-user-service');
```

### parent-rls-service.js

**Status:** Deprecated  
**Replacement:** `requireParentAccess()` middleware from `middleware/sub-entity.js`  
**Note:** Uses declarative RLS rules from metadata instead of imperative checks.

## Creating a New Service

1. Copy this template:

```javascript
/**
 * NewService - [Description]
 *
 * SRP: [Single responsibility]
 *
 * DESIGN:
 * - [Key design decisions]
 */

const db = require('../db/connection');
const { logger } = require('../config/logger');
const AppError = require('../utils/app-error');

class NewService {
  /**
   * [Method description]
   * @param {type} param - Description
   * @returns {Promise<type>} Description
   */
  static async methodName(param) {
    try {
      // Implementation
    } catch (error) {
      logger.error('Error in methodName', { error: error.message });
      throw error;
    }
  }

  // ===========================================================================
  // HEALTH CHECK METHODS (Standard Service Pattern)
  // ===========================================================================

  static isConfigured() {
    return true;
  }

  static getConfigurationInfo() {
    return { configured: true };
  }

  static async healthCheck(timeoutMs = 5000) {
    const start = Date.now();

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timed out')), timeoutMs);
      });

      const queryPromise = db.query('SELECT 1');
      await Promise.race([queryPromise, timeoutPromise]);

      return {
        configured: true,
        reachable: true,
        responseTime: Date.now() - start,
        status: 'healthy',
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        responseTime: Date.now() - start,
        status: error.message?.includes('timed out') ? 'timeout' : 'critical',
        message: error.message,
      };
    }
  }
}

module.exports = NewService;
```

2. Add tests in `__tests__/unit/services/new-service.test.js`
3. Document in this file

## Testing Services

All services should have unit tests that:

1. Test each public method
2. Test error handling paths
3. Mock database calls
4. Test health check methods

Example test structure:
```javascript
describe('NewService', () => {
  describe('methodName', () => {
    it('returns expected result', async () => { /* ... */ });
    it('throws on invalid input', async () => { /* ... */ });
  });

  describe('healthCheck', () => {
    it('returns healthy when DB is available', async () => { /* ... */ });
    it('returns critical when DB fails', async () => { /* ... */ });
  });
});
```
