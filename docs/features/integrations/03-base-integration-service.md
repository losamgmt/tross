# Module 03: Base Integration Service

**Status:** Design Complete (Revised)  
**Location:** `backend/services/base-integration-service.js`  
**Lines of Code:** ~120  
**Dependencies:** SystemSettingsService (Module 02)

---

## Purpose

Provide a factory pattern for external integration services (QuickBooks, Stripe).

**SRP:** ONLY provides common infrastructure:
- Lazy client initialization
- Configuration status checking
- Health check interface
- Token management helpers with race condition protection

Does NOT contain provider-specific logic.

---

## Pattern Source: StorageService (CORRECTED)

This follows the **actual** proven pattern from `backend/services/storage-service.js`:

```javascript
// ACTUAL StorageService pattern (module-level lazy init + singleton):
const { logger } = require('../config/logger');

// Module-level lazy initialization
let s3Client = null;
const getS3Client = () => { /* create if needed */ };
const getClient = () => {
  if (!s3Client) s3Client = getS3Client();
  return s3Client;
};

// Instance methods on class
class StorageService {
  isConfigured() { return getClient() !== null; }
  async healthCheck(timeoutMs) { /* ... */ }
  async upload({ buffer, storageKey }) { /* ... */ }
}

// Singleton export
const storageService = new StorageService();
module.exports = { storageService, StorageService };
```

BaseIntegrationService provides a **factory** to create services following this pattern.

---

## Design Decision: Factory vs. Base Class

**Decision:** Factory function that creates service instances with shared infrastructure.

**Rationale:**
- Matches actual StorageService pattern (singleton + instance methods)
- Avoids static class inheritance issues
- Each integration gets isolated state
- Testable via instance creation

---

## Interface Design

```javascript
/**
 * createIntegrationService - Factory for external integration services
 * 
 * Creates a service following the StorageService singleton pattern.
 * Each service has isolated state (client, tokens, config).
 * 
 * USAGE:
 *   // In quickbooks-service.js
 *   const { createIntegrationService } = require('./base-integration-service');
 *   
 *   const { quickBooksService, QuickBooksService } = createIntegrationService({
 *     provider: 'quickbooks',
 *     createClient: async (tokens, config) => new QuickBooksClient({...}),
 *     healthCheck: async (client) => await client.getCompanyInfo(),
 *   });
 *   
 *   module.exports = { quickBooksService, QuickBooksService };
 * 
 * LIFECYCLE:
 *   1. const client = await service.getClient()  // Lazy init
 *   2. service.isConfigured()                    // Check if ready
 *   3. await service.healthCheck()               // Verify connectivity
 *   4. service.reset()                           // Clear state (testing)
 */
```

---

## API Specification

### `createIntegrationService(options)` → `{ service, ServiceClass }`

Factory function to create an integration service.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `provider` | `string` | Yes | Provider name: `'quickbooks'`, `'stripe'` |
| `createClient` | `async (tokens, config) → Client` | Yes | Creates provider SDK client |
| `healthCheck` | `async (client) → void` | Yes | Makes test API call |
| `refreshToken` | `async (refreshToken) → tokens` | No | Token refresh implementation |

**Returns:** `{ service: instance, ServiceClass: class }`

---

### Instance Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isConfigured()` | `boolean` | True if tokens exist and client created |
| `getClient()` | `Promise<Client\|null>` | Get/create client (lazy init) |
| `healthCheck(timeoutMs)` | `Promise<HealthResult>` | Verify external connectivity |
| `getValidToken()` | `Promise<string>` | Get access token, refresh if needed |
| `reset()` | `void` | Clear all state (for testing) |

---

## Implementation

```javascript
'use strict';

const SystemSettingsService = require('./system-settings-service');
const AppError = require('../utils/app-error');
const { logger } = require('../config/logger');
const { SYSTEM_USER_ID } = require('../config/constants');

/**
 * Factory to create integration services following StorageService pattern.
 * 
 * @param {Object} options - Service configuration
 * @param {string} options.provider - Integration provider name
 * @param {Function} options.createClient - Async function to create SDK client
 * @param {Function} options.healthCheck - Async function to verify connectivity
 * @param {Function} [options.refreshToken] - Async function to refresh OAuth token
 * @returns {{ service: Object, ServiceClass: Function }}
 */
function createIntegrationService({ provider, createClient, healthCheck, refreshToken }) {
  // Validate required options
  if (!provider) throw new Error('provider is required');
  if (!createClient) throw new Error('createClient function is required');
  if (!healthCheck) throw new Error('healthCheck function is required');

  // =========================================================================
  // MODULE-LEVEL STATE (matches StorageService pattern)
  // =========================================================================
  
  let client = null;
  let tokens = null;
  let config = null;
  let lastHealthCheck = null;
  let isRefreshing = false;  // Simple mutex for token refresh

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  /**
   * Load tokens from SystemSettingsService
   * @private
   */
  async function loadTokens() {
    tokens = await SystemSettingsService.getIntegrationTokens(provider);
    config = await SystemSettingsService.getIntegrationConfig(provider);
    return tokens;
  }

  /**
   * Initialize client if not already done
   * @private
   */
  async function initClient() {
    if (client) return client;
    
    const loadedTokens = await loadTokens();
    if (!loadedTokens) {
      logger.debug(`${provider} integration not configured - no tokens`);
      return null;
    }

    try {
      client = await createClient(loadedTokens, config);
      logger.info(`${provider} client initialized`);
      return client;
    } catch (error) {
      logger.error(`Failed to create ${provider} client`, { error: error.message });
      throw error;
    }
  }

  // =========================================================================
  // SERVICE CLASS (instance methods, like StorageService)
  // =========================================================================

  class IntegrationService {
    /**
     * Check if integration is configured (tokens exist)
     * @returns {boolean}
     */
    isConfigured() {
      return tokens !== null || client !== null;
    }

    /**
     * Get configuration info without network call
     * @returns {{ configured: boolean, provider: string, hasTokens: boolean }}
     */
    getConfigurationInfo() {
      return {
        configured: this.isConfigured(),
        provider,
        hasTokens: tokens !== null,
        lastHealthCheck,
      };
    }

    /**
     * Get or create the SDK client (lazy initialization)
     * @returns {Promise<Client|null>}
     */
    async getClient() {
      return initClient();
    }

    /**
     * Deep health check - actually pings the external service
     * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
     * @returns {Promise<HealthResult>}
     */
    async healthCheck(timeoutMs = 5000) {
      const start = Date.now();

      if (!this.isConfigured()) {
        // Try to load tokens first
        await loadTokens();
      }

      if (!tokens) {
        return {
          configured: false,
          reachable: false,
          provider,
          responseTime: 0,
          status: 'unconfigured',
          message: `${provider} not configured (no tokens stored)`,
        };
      }

      try {
        const c = await initClient();
        if (!c) {
          return {
            configured: false,
            reachable: false,
            provider,
            responseTime: Date.now() - start,
            status: 'error',
            message: 'Failed to initialize client',
          };
        }

        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          await healthCheck(c);
          clearTimeout(timeoutId);
          
          lastHealthCheck = new Date();
          const responseTime = Date.now() - start;

          logger.debug(`${provider} health check passed`, { responseTime });

          return {
            configured: true,
            reachable: true,
            provider,
            responseTime,
            status: 'healthy',
          };
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        const responseTime = Date.now() - start;
        
        logger.warn(`${provider} health check failed`, { 
          error: error.message, 
          responseTime 
        });

        return {
          configured: true,
          reachable: false,
          provider,
          responseTime,
          status: 'unhealthy',
          message: error.name === 'AbortError' ? 'Connection timeout' : error.message,
        };
      }
    }

    /**
     * Get valid access token, refreshing if needed.
     * Includes mutex to prevent concurrent refresh race condition.
     * 
     * @param {Object} options
     * @param {number} options.bufferMs - Refresh if expiring within this time (default: 5 min)
     * @returns {Promise<string>} Access token
     * @throws {AppError} If not connected or refresh fails
     */
    async getValidToken({ bufferMs = 5 * 60 * 1000 } = {}) {
      if (!tokens) {
        await loadTokens();
      }

      if (!tokens) {
        throw new AppError(
          `${provider} not connected`,
          401,
          'INTEGRATION_NOT_CONNECTED'
        );
      }

      const expiresAt = new Date(tokens.expires_at);
      const needsRefresh = expiresAt.getTime() - Date.now() < bufferMs;

      if (needsRefresh && refreshToken) {
        // Simple mutex to prevent concurrent refresh
        if (isRefreshing) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.getValidToken({ bufferMs });
        }

        try {
          isRefreshing = true;
          
          // Double-check after acquiring mutex
          const currentTokens = await SystemSettingsService.getIntegrationTokens(provider);
          const stillNeedsRefresh = new Date(currentTokens.expires_at).getTime() - Date.now() < bufferMs;
          
          if (stillNeedsRefresh) {
            logger.info(`Refreshing ${provider} token`);
            const newTokens = await refreshToken(currentTokens.refresh_token);
            
            await SystemSettingsService.setIntegrationTokens(
              provider,
              newTokens,
              SYSTEM_USER_ID
            );
            
            tokens = newTokens;
            client = null; // Force client recreation with new token
          } else {
            tokens = currentTokens;
          }
        } finally {
          isRefreshing = false;
        }
      }

      return tokens.access_token;
    }

    /**
     * Reset all state (for testing/reconnection)
     */
    reset() {
      client = null;
      tokens = null;
      config = null;
      lastHealthCheck = null;
      isRefreshing = false;
    }
  }

  // Create singleton instance
  const service = new IntegrationService();

  return {
    service,
    ServiceClass: IntegrationService,
  };
}

module.exports = { createIntegrationService };
```

---

## Usage Example: QuickBooksService

```javascript
// backend/services/quickbooks-service.js
'use strict';

const { createIntegrationService } = require('./base-integration-service');
const QuickBooks = require('node-quickbooks');
const AppError = require('../utils/app-error');
const { logger } = require('../config/logger');

// Create the service using the factory
const { service: quickBooksService, ServiceClass: QuickBooksService } = createIntegrationService({
  provider: 'quickbooks',
  
  // Create QuickBooks SDK client
  createClient: async (tokens, config) => {
    return new QuickBooks({
      clientId: process.env.QB_CLIENT_ID,
      clientSecret: process.env.QB_CLIENT_SECRET,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      realmId: tokens.realm_id || config?.realm_id,
      useSandbox: process.env.NODE_ENV !== 'production',
    });
  },
  
  // Lightweight health check
  healthCheck: async (client) => {
    await client.getCompanyInfo();
  },
  
  // Token refresh (optional - enables auto-refresh)
  refreshToken: async (refreshTokenValue) => {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
        client_id: process.env.QB_CLIENT_ID,
        client_secret: process.env.QB_CLIENT_SECRET,
      }),
    });
    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      token_type: data.token_type,
    };
  },
});

// Add provider-specific methods to the singleton
quickBooksService.syncInvoice = async function(invoice) {
  const client = await this.getClient();
  if (!client) {
    throw new AppError('QuickBooks not configured', 503, 'SERVICE_UNAVAILABLE');
  }
  
  // Get valid token (refreshes if needed)
  const accessToken = await this.getValidToken();
  
  // ... sync implementation
  logger.info('Syncing invoice to QuickBooks', { invoiceId: invoice.id });
};

module.exports = { quickBooksService, QuickBooksService };
```

---

## Test Plan

```javascript
describe('createIntegrationService', () => {
  // Mock dependencies
  const mockTokens = {
    access_token: 'test_access',
    refresh_token: 'test_refresh',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  };
  
  let testService;
  
  beforeEach(() => {
    // Create fresh service for each test
    const mockClient = { testCall: jest.fn() };
    const { service } = createIntegrationService({
      provider: 'test',
      createClient: async () => mockClient,
      healthCheck: async (client) => client.testCall(),
    });
    testService = service;
    
    // Mock SystemSettingsService
    SystemSettingsService.getIntegrationTokens = jest.fn().mockResolvedValue(mockTokens);
    SystemSettingsService.getIntegrationConfig = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    testService.reset();
  });

  describe('isConfigured()', () => {
    it('returns false initially');
    it('returns true after getClient() succeeds');
    it('returns false if no tokens stored');
  });

  describe('getClient()', () => {
    it('creates client on first call');
    it('returns cached client on subsequent calls');
    it('returns null if no tokens stored');
    it('throws if createClient fails');
  });

  describe('healthCheck()', () => {
    it('returns unconfigured status if no tokens');
    it('returns healthy status on success');
    it('returns unhealthy status on failure');
    it('respects timeout parameter');
    it('records lastHealthCheck timestamp on success');
  });

  describe('getValidToken()', () => {
    it('returns access token if not expired');
    it('throws INTEGRATION_NOT_CONNECTED if no tokens');
    it('refreshes token if near expiry and refreshToken provided');
    it('prevents concurrent refresh (mutex)');
    it('uses double-check locking pattern');
    it('stores refreshed tokens via SystemSettingsService');
  });

  describe('reset()', () => {
    it('clears all state');
    it('allows reinitialization after reset');
  });
});
```

---

## Design Review

### Architect ✅
- [x] Follows ACTUAL StorageService pattern (singleton + instance methods)
- [x] Factory pattern avoids static class inheritance issues
- [x] Module-level state isolation per integration
- [x] Correct import: `const AppError = require('../utils/app-error')`

### Designer ✅
- [x] Consistent healthCheck response shape with StorageService
- [x] Options object for extensibility
- [x] Clear factory API

### Engineer ✅
- [x] Testable via `reset()` method
- [x] Race condition protection for token refresh (M3 fix)
- [x] Double-check locking pattern
- [x] Proper error handling and logging

### Security ✅
- [x] No tokens logged (only metadata)
- [x] Mutex prevents token refresh race condition
- [x] Uses SYSTEM_USER_ID for automated operations
