# Module 02: Integration Credentials Service

**Status:** Implemented ✅  
**Location:** `backend/services/integrations/token-service.js`  
**Lines of Code:** ~310  
**Test Coverage:** 24 tests (system-settings-service suite includes delegation tests)  
**Dependencies:** Database (system_settings table)

> **Update (April 2026):** Extracted to dedicated `IntegrationTokenService` during service layer audit.  
> `SystemSettingsService` retains deprecated wrapper methods for backward compatibility.

---

## Purpose

Store and retrieve OAuth tokens for external integrations (QuickBooks, Stripe).

**SRP:** ONLY manages credential storage. Does NOT:
- Perform OAuth flows
- Refresh tokens (that's the runner's job - see Module 03)
- Make API calls to external services
- Validate token format

---

## Design Decision: Dedicated Service (Revised)

**Original Decision:** Extend `SystemSettingsService` with helper methods.

**Revised Decision (April 2026):** Extract to dedicated `IntegrationTokenService`.

**Rationale for extraction:**
- SRP: Token management is distinct from feature flags/maintenance mode
- Service layer reorganization created `services/integrations/` directory
- Cleaner separation of concerns

**Current State:**
- `IntegrationTokenService` owns all token logic
- `SystemSettingsService` has deprecated wrapper methods that delegate

---

## Key Pattern: Namespaced Keys

```
Key Format: integration.{provider}.{type}

Examples:
  integration.quickbooks.tokens     → OAuth access/refresh tokens
  integration.quickbooks.config     → Company ID, realm ID, etc.
  integration.stripe.config         → Account ID, mode (test/live)
```

This keeps integration data organized while leveraging existing infrastructure.

---

## Interface Design

```javascript
// Added to SystemSettingsService

/**
 * INTEGRATION CREDENTIALS HELPERS
 * 
 * Key naming convention: integration.{provider}.{type}
 * All values stored as JSONB in system_settings table.
 * 
 * SECURITY:
 * - Tokens stored in database (not env vars) for rotation support
 * - Access restricted to admin role at route level
 * - Audit trail via updated_by field
 * 
 * USAGE:
 *   const tokens = await SystemSettingsService.getIntegrationTokens('quickbooks');
 *   await SystemSettingsService.setIntegrationTokens('quickbooks', newTokens, userId);
 */
```

---

## API Additions

### `getIntegrationTokens(provider)` → `Promise<Object|null>`

Retrieve OAuth tokens for a provider.

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider name: `'quickbooks'`, `'stripe'` |

**Returns:**
```javascript
{
  access_token: 'eyJ...',
  refresh_token: 'AB1...',
  expires_at: '2026-04-09T18:00:00Z',  // ISO timestamp
  token_type: 'Bearer',
  // Provider-specific fields:
  realm_id: '123456789',  // QuickBooks company ID
}
```

**Returns `null`** if no tokens stored.

---

### `setIntegrationTokens(provider, tokens, userId)` → `Promise<Object>`

Store OAuth tokens for a provider.

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider name |
| `tokens` | `Object` | Token object (shape varies by provider) |
| `userId` | `number` | Admin user ID for audit trail |

**Returns:** The updated setting record.

**Logs:** Security event `INTEGRATION_TOKENS_UPDATED`

---

### `clearIntegrationTokens(provider, userId)` → `Promise<boolean>`

Remove tokens (disconnect integration).

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `string` | Provider name |
| `userId` | `number` | Admin user ID for audit trail |

**Returns:** `true` if tokens existed and were cleared.

**Logs:** Security event `INTEGRATION_DISCONNECTED`

---

### `getIntegrationConfig(provider)` → `Promise<Object|null>`

Get non-secret configuration (account IDs, modes, etc.).

---

### `setIntegrationConfig(provider, config, userId)` → `Promise<Object>`

Store non-secret configuration.

---

## Implementation

```javascript
// Added to SystemSettingsService class

// ===========================================================================
// INTEGRATION CREDENTIALS HELPERS
// ===========================================================================

/**
 * Valid integration providers
 * @private
 */
static INTEGRATION_PROVIDERS = ['quickbooks', 'stripe'];

/**
 * Validate provider name
 * @private
 */
static _validateProvider(provider) {
  if (!provider || !this.INTEGRATION_PROVIDERS.includes(provider)) {
    throw new AppError(
      `Invalid integration provider: ${provider}. Valid: ${this.INTEGRATION_PROVIDERS.join(', ')}`,
      400,
      'BAD_REQUEST'
    );
  }
}

/**
 * Get OAuth tokens for an integration
 */
static async getIntegrationTokens(provider) {
  this._validateProvider(provider);
  const setting = await this.getSetting(`integration.${provider}.tokens`);
  return setting?.value || null;
}

/**
 * Store OAuth tokens for an integration
 */
static async setIntegrationTokens(provider, tokens, userId) {
  this._validateProvider(provider);
  
  if (!tokens || typeof tokens !== 'object') {
    throw new AppError('Tokens must be an object', 400, 'BAD_REQUEST');
  }

  // Add storage timestamp for debugging
  const tokenData = {
    ...tokens,
    stored_at: new Date().toISOString(),
  };

  const result = await this.updateSetting(
    `integration.${provider}.tokens`,
    tokenData,
    userId
  );

  logSecurityEvent('INTEGRATION_TOKENS_UPDATED', {
    provider,
    userId,
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresAt: tokens.expires_at,
  });

  return result;
}

/**
 * Clear tokens (disconnect integration)
 * Uses deleteSetting() if available, otherwise sets value to null.
 * 
 * @param {string} provider - Integration provider name
 * @param {number} userId - Admin user ID for audit trail
 * @returns {Promise<boolean>} True if tokens existed and were cleared
 */
static async clearIntegrationTokens(provider, userId) {
  this._validateProvider(provider);

  const existing = await this.getIntegrationTokens(provider);
  if (!existing) return false;

  const key = `integration.${provider}.tokens`;
  
  // Use deleteSetting if available, otherwise set to null
  // (SystemSettingsService.deleteSetting may need to be added)
  if (typeof this.deleteSetting === 'function') {
    await this.deleteSetting(key, userId);
  } else {
    // Fallback: Set to null to mark as deleted
    // Note: Consider adding deleteSetting() to SystemSettingsService
    await db(
      `DELETE FROM system_settings WHERE key = $1`,
      [key]
    );
  }

  logSecurityEvent('INTEGRATION_DISCONNECTED', {
    provider,
    userId,
    clearedKey: key,
  });

  return true;
}

/**
 * Get non-secret configuration for an integration
 */
static async getIntegrationConfig(provider) {
  this._validateProvider(provider);
  const setting = await this.getSetting(`integration.${provider}.config`);
  return setting?.value || null;
}

/**
 * Store non-secret configuration for an integration
 */
static async setIntegrationConfig(provider, config, userId) {
  this._validateProvider(provider);
  return this.updateSetting(
    `integration.${provider}.config`,
    config,
    userId
  );
}
```

---

## Token Refresh Pattern (Consumer Responsibility)

The credentials service **stores** tokens but doesn't refresh them. Here's the pattern for consumers:

```javascript
// In QuickBooksService (example consumer)
const { SYSTEM_USER_ID } = require('../config/constants');

async _getValidToken() {
  const tokens = await SystemSettingsService.getIntegrationTokens('quickbooks');
  
  if (!tokens) {
    throw new AppError('QuickBooks not connected', 401, 'INTEGRATION_NOT_CONNECTED');
  }

  // Check if token is expired (with 5-minute buffer)
  const expiresAt = new Date(tokens.expires_at);
  const buffer = 5 * 60 * 1000; // 5 minutes
  
  if (expiresAt.getTime() - Date.now() < buffer) {
    // Refresh token
    const newTokens = await this._refreshToken(tokens.refresh_token);
    await SystemSettingsService.setIntegrationTokens('quickbooks', newTokens, SYSTEM_USER_ID);
    return newTokens.access_token;
  }

  return tokens.access_token;
}
```

---

## Test Plan

```javascript
describe('SystemSettingsService - Integration Credentials', () => {
  describe('getIntegrationTokens()', () => {
    it('returns null if no tokens stored');
    it('returns tokens object if stored');
    it('throws AppError for invalid provider');
    it('throws AppError for empty provider');
  });

  describe('setIntegrationTokens()', () => {
    it('stores tokens with stored_at timestamp');
    it('logs INTEGRATION_TOKENS_UPDATED security event');
    it('throws AppError for invalid provider');
    it('throws AppError if tokens not an object');
    it('throws AppError if tokens is null');
  });

  describe('clearIntegrationTokens()', () => {
    it('returns false if no tokens existed');
    it('returns true and removes tokens if existed');
    it('logs INTEGRATION_DISCONNECTED security event');
    it('throws AppError for invalid provider');
  });

  describe('getIntegrationConfig()', () => {
    it('returns null if no config stored');
    it('returns config object if stored');
  });

  describe('setIntegrationConfig()', () => {
    it('stores config via updateSetting');
    it('throws for invalid provider');
  });
});
```

---

## Design Review

### Architect ✅
- [x] Extends existing service (DRY)
- [x] Key namespacing prevents collision
- [x] No new tables needed
- [x] Audit trail built-in

### Designer ✅
- [x] API mirrors existing `getSetting/updateSetting`
- [x] Provider validation prevents typos
- [x] Clear naming: `tokens` vs `config`

### Engineer ✅
- [x] Testable with mocked DB
- [x] Clear error messages
- [x] Security events logged
- [x] Migration path: none needed

### Security ✅
- [x] Tokens stored in database (not env vars) for rotation support
- [x] Admin-only write access at route level
- [x] Security events logged for token changes
- [x] Audit trail via `updated_by` field
