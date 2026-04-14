# Module 03: Integration Runner

**Status:** Design Revised (April 2026)  
**Location:** `backend/services/integrations/runner.js`  
**Lines of Code:** ~150 estimated  
**Dependencies:** IntegrationTokenService (Module 02)

---

## Purpose

Provide a **runner** that executes integration operations with shared infrastructure.

**SRP:** ONLY provides common infrastructure:
- Token validation and refresh with mutex
- Provider interface enforcement (duck typing)
- Shared error handling and logging
- Health check aggregation

Does NOT contain provider-specific logic - that lives in `providers/*.js`.

---

## Architecture: Runner + Providers

**Pattern:** Composition via runner that delegates to provider scripts.

```
services/integrations/
├── token-service.js     # Token storage (Module 02) ✅ EXISTS
├── runner.js            # This module - orchestrates operations
├── index.js             # Barrel exports
└── providers/
    ├── index.js         # Provider registry
    ├── quickbooks.js    # QB-specific implementation
    └── stripe.js        # Stripe-specific implementation
```

**Key Insight (from service reorganization):** 
- Auth strategies use this pattern: `auth/strategies/` with factory
- Providers implement interface via convention, not inheritance
- Runner enforces interface at runtime via duck typing

---

## Design Decision: Runner vs. Base Class

**Decision:** Runner function that validates and executes provider operations.

**Rationale:**
- Matches auth/strategies pattern from service reorganization
- JavaScript lacks interfaces - duck typing + JSDoc is idiomatic
- Providers are simple modules (easy to test in isolation)
- Runner validates interface at runtime (fail fast)
- No inheritance chains to debug

---

## Provider Interface Contract

Each provider module in `providers/*.js` must export these methods:

```javascript
/**
 * @typedef {Object} IntegrationProvider
 * Required methods (runner validates these exist):
 */
module.exports = {
  // REQUIRED: Health check for this provider
  healthCheck: async (tokens) => ({ status: 'healthy' }),
  
  // REQUIRED: Refresh OAuth tokens
  refreshToken: async (refreshToken) => ({
    access_token: '...',
    refresh_token: '...',
    expires_at: '2026-04-15T12:00:00Z',
  }),
  
  // OPTIONAL: Provider-specific operations
  syncInvoice: async (tokens, { invoiceId, data }) => ({ success: true }),
  syncPayment: async (tokens, { paymentId, data }) => ({ success: true }),
  createCustomer: async (tokens, { data }) => ({ customerId: '...' }),
};
```

---

## Runner API

### `runIntegration(provider, operation, options)` → `Promise<Result>`

Execute an operation on a provider with shared infrastructure.

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider name: `'quickbooks'`, `'stripe'` |
| `operation` | `string` | Method name: `'syncInvoice'`, `'healthCheck'`, etc. |
| `options` | `Object` | Operation-specific options passed to provider |

**Returns:** Result from provider method

**Throws:** `AppError` if provider not connected or operation unsupported

---

## Runner Implementation

```javascript
// services/integrations/runner.js
'use strict';

const IntegrationTokenService = require('./token-service');
const AppError = require('../../utils/app-error');
const { logger, logSecurityEvent } = require('../../config/logger');
const { SYSTEM_USER_ID } = require('../../config/constants');

/**
 * Required methods every provider must implement
 */
const REQUIRED_METHODS = ['healthCheck', 'refreshToken'];

/**
 * Token refresh mutex state (per provider)
 */
const refreshingProviders = new Set();

/**
 * Load and validate a provider module
 * @private
 */
function loadProvider(providerName) {
  IntegrationTokenService._validateProvider(providerName);
  
  const provider = require(`./providers/${providerName}`);
  
  // Enforce interface via duck typing
  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== 'function') {
      throw new Error(
        `Provider '${providerName}' missing required method: ${method}`
      );
    }
  }
  
  return provider;
}

/**
 * Get valid tokens, refreshing if needed (with mutex)
 * @private
 */
async function getValidTokens(providerName, provider, bufferMs = 5 * 60 * 1000) {
  let tokens = await IntegrationTokenService.getTokens(providerName);
  
  if (!tokens) {
    throw new AppError(
      `${providerName} integration not connected`,
      401,
      'INTEGRATION_NOT_CONNECTED'
    );
  }
  
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null;
  const needsRefresh = expiresAt && (expiresAt.getTime() - Date.now() < bufferMs);
  
  if (needsRefresh) {
    // Mutex: wait if another refresh is in progress
    if (refreshingProviders.has(providerName)) {
      await new Promise(r => setTimeout(r, 1000));
      return getValidTokens(providerName, provider, bufferMs);
    }
    
    try {
      refreshingProviders.add(providerName);
      
      // Double-check after acquiring mutex
      tokens = await IntegrationTokenService.getTokens(providerName);
      const stillNeedsRefresh = new Date(tokens.expires_at).getTime() - Date.now() < bufferMs;
      
      if (stillNeedsRefresh) {
        logger.info(`Refreshing ${providerName} tokens`);
        const newTokens = await provider.refreshToken(tokens.refresh_token);
        await IntegrationTokenService.setTokens(providerName, newTokens, SYSTEM_USER_ID);
        tokens = newTokens;
        
        logSecurityEvent('INTEGRATION_TOKEN_REFRESHED', { provider: providerName });
      }
    } finally {
      refreshingProviders.delete(providerName);
    }
  }
  
  return tokens;
}

/**
 * Run an integration operation with automatic token handling
 * 
 * @param {string} providerName - Provider name (e.g., 'quickbooks', 'stripe')
 * @param {string} operation - Operation method name on the provider
 * @param {Object} params - Parameters to pass to the operation
 * @returns {Promise<any>} - Operation result
 */
async function run(providerName, operation, params = {}) {
  const provider = loadProvider(providerName);
  
  if (typeof provider[operation] !== 'function') {
    throw new Error(
      `Provider '${providerName}' does not support operation: ${operation}`
    );
  }
  
  const tokens = await getValidTokens(providerName, provider);
  
  try {
    const result = await provider[operation](tokens, params);
    return result;
  } catch (error) {
    // Log but don't expose internal details
    logger.error(`Integration operation failed: ${providerName}.${operation}`, {
      error: error.message,
      code: error.code,
    });
    
    throw new AppError(
      `${providerName} operation failed: ${operation}`,
      error.statusCode || 500,
      'INTEGRATION_OPERATION_FAILED',
      { provider: providerName, operation }
    );
  }
}

/**
 * Run health checks for all or specified providers
 * 
 * @param {string[]} [providers] - Provider names (defaults to all)
 * @returns {Promise<Object>} - Health check results by provider
 */
async function healthCheckAll(providers) {
  const toCheck = providers || ['quickbooks', 'stripe'];
  const results = {};
  
  await Promise.all(toCheck.map(async (providerName) => {
    try {
      const provider = loadProvider(providerName);
      const tokenStatus = await IntegrationTokenService.checkTokenStatus(providerName);
      
      if (!tokenStatus.hasTokens) {
        results[providerName] = {
          status: 'unconfigured',
          configured: false,
          reachable: false,
        };
        return;
      }
      
      const tokens = await IntegrationTokenService.getTokens(providerName);
      const healthy = await provider.healthCheck(tokens);
      
      results[providerName] = {
        status: healthy ? 'healthy' : 'unhealthy',
        configured: true,
        reachable: healthy,
        tokenExpiresAt: tokenStatus.expiresAt,
      };
    } catch (error) {
      results[providerName] = {
        status: 'error',
        configured: false,
        reachable: false,
        error: error.message,
      };
    }
  }));
  
  return results;
}

module.exports = {
  run,
  healthCheckAll,
  // For testing
  _loadProvider: loadProvider,
  _getValidTokens: getValidTokens,
};
```

---

## Provider Template

```javascript
// services/integrations/providers/quickbooks.js
'use strict';

const AppError = require('../../../utils/app-error');
const { logger } = require('../../../config/logger');

/**
 * QuickBooks integration provider
 */

/**
 * Required: Health check - verify connectivity with QuickBooks
 * @param {Object} tokens - Access tokens
 * @returns {Promise<boolean>}
 */
async function healthCheck(tokens) {
  try {
    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${tokens.realm_id}/companyinfo/${tokens.realm_id}`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    return response.ok;
  } catch (error) {
    logger.warn('QuickBooks health check failed', { error: error.message });
    return false;
  }
}

/**
 * Required: Refresh the OAuth access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - New tokens object
 */
async function refreshToken(refreshTokenValue) {
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
  
  if (!response.ok) {
    throw new AppError('QuickBooks token refresh failed', 401, 'TOKEN_REFRESH_FAILED');
  }
  
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    token_type: data.token_type,
  };
}

/**
 * Optional: Sync an invoice to QuickBooks
 * @param {Object} tokens - Access tokens
 * @param {Object} params - { invoice }
 * @returns {Promise<Object>} - QuickBooks invoice reference
 */
async function syncInvoice(tokens, { invoice }) {
  logger.info('Syncing invoice to QuickBooks', { invoiceId: invoice.id });
  
  // Implementation...
  
  return { qbInvoiceId: 'QB-123' };
}

module.exports = {
  healthCheck,
  refreshToken,
  syncInvoice,
};
```

---

## Usage Example

```javascript
// In a route handler or service
const IntegrationRunner = require('./services/integrations/runner');

// Run a QuickBooks operation
const result = await IntegrationRunner.run('quickbooks', 'syncInvoice', {
  invoice: { id: inv.id, amount: inv.total },
});

// Health check all integrations
const health = await IntegrationRunner.healthCheckAll();
// { quickbooks: { status: 'healthy', ... }, stripe: { status: 'unconfigured', ... } }
```

---

## Test Plan

```javascript
describe('IntegrationRunner', () => {
  describe('run()', () => {
    it('loads provider and executes operation');
    it('validates provider has required methods');
    it('validates provider has requested operation');
    it('gets valid tokens before running');
    it('handles operation errors with appropriate AppError');
  });
  
  describe('getValidTokens() (internal)', () => {
    it('returns tokens if not expired');
    it('throws INTEGRATION_NOT_CONNECTED if no tokens');
    it('refreshes token if near expiry');
    it('prevents concurrent refresh (mutex)');
    it('uses double-check locking pattern');
    it('stores refreshed tokens via token-service');
    it('logs security event on refresh');
  });
  
  describe('healthCheckAll()', () => {
    it('checks all default providers');
    it('checks only specified providers');
    it('returns unconfigured status if no tokens');
    it('returns healthy/unhealthy based on provider.healthCheck()');
    it('handles provider errors gracefully');
  });
  
  describe('loadProvider() (internal)', () => {
    it('validates provider name');
    it('requires healthCheck method');
    it('requires refreshToken method');
    it('allows optional operation methods');
  });
});
```

---

## Design Review

### Architect ✅
- [x] Runner + providers pattern (matches auth/strategies)
- [x] Duck typing for interface enforcement (idiomatic JS)
- [x] Tokens delegated to dedicated token-service
- [x] Clear separation: orchestration vs. provider-specific logic

### Designer ✅
- [x] Simple API: `run(provider, operation, params)`
- [x] Consistent health check response shape
- [x] Provider template shows required vs. optional methods

### Engineer ✅
- [x] Mutex prevents token refresh race condition
- [x] Double-check locking pattern
- [x] Providers testable in isolation
- [x] Clear error codes and logging

### Security ✅
- [x] No tokens logged (only metadata)
- [x] Security event logged on token refresh
- [x] Uses SYSTEM_USER_ID for automated operations
