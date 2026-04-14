'use strict';

/**
 * Integration Provider Metadata
 *
 * Declarative configuration for all third-party integrations.
 * This is the SSOT for integration capabilities, OAuth config, and webhook handling.
 *
 * PATTERN: Mirrors entity metadata pattern
 * - config/models/*.js → entity definitions
 * - config/integration-providers.js → integration definitions
 *
 * ADDING A NEW INTEGRATION:
 * 1. Add provider config here
 * 2. Create providers/{name}.js with required methods
 * 3. Add env vars to env-manifest.js
 * 4. Done - routes are auto-generated
 */

/**
 * OAuth2 flow types
 */
const OAUTH_TYPES = {
  AUTHORIZATION_CODE: 'oauth2_authcode',
  // Future: 'oauth2_client_credentials', 'oauth1', etc.
};

/**
 * Webhook verifier types (maps to WebhookValidator methods)
 */
const WEBHOOK_VERIFIERS = {
  STRIPE: 'stripe',           // verifyStripe() - with timestamp/replay protection
  QUICKBOOKS: 'quickbooks',   // verifyQuickBooks() - base64 HMAC
  GENERIC: 'generic',         // verify() - standard HMAC-SHA256
};

/**
 * Integration provider configurations
 *
 * Each provider defines:
 * - displayName: Human-readable name for UI
 * - description: Brief description of the integration
 * - oauth: OAuth2 configuration (null for API key based)
 * - apiKey: API key configuration (null for OAuth based)
 * - webhook: Webhook signature verification config
 * - capabilities: Operations this provider supports
 * - envVars: Environment variables this provider needs
 */
const PROVIDERS = {
  // ===========================================================================
  // QUICKBOOKS ONLINE
  // ===========================================================================
  quickbooks: {
    displayName: 'QuickBooks Online',
    description: 'Sync invoices and customers with QuickBooks accounting',
    category: 'accounting',

    // OAuth2 Authorization Code flow
    oauth: {
      type: OAUTH_TYPES.AUTHORIZATION_CODE,
      authUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
      scopes: ['com.intuit.quickbooks.accounting'],

      // Env vars for OAuth credentials
      envVars: {
        clientId: 'QB_CLIENT_ID',
        clientSecret: 'QB_CLIENT_SECRET',
      },

      // Extra params returned in callback that we need to store
      // QuickBooks returns realmId (company ID) in the callback
      callbackParams: ['realmId'],

      // Token refresh settings
      refreshBuffer: 5 * 60 * 1000, // Refresh 5 min before expiry
    },

    // Not API key based
    apiKey: null,

    // Webhook configuration
    webhook: {
      signatureHeader: 'intuit-signature',
      verifier: WEBHOOK_VERIFIERS.QUICKBOOKS,
      envVar: 'QB_WEBHOOK_VERIFIER_TOKEN',
      // QuickBooks doesn't include timestamp - need idempotency
      hasReplayProtection: false,
    },

    // Operations this provider supports (maps to provider methods)
    capabilities: [
      'syncInvoice',
      'syncCustomer',
    ],

    // All env vars this provider needs
    envVars: [
      'QB_CLIENT_ID',
      'QB_CLIENT_SECRET',
      'QB_WEBHOOK_VERIFIER_TOKEN',
    ],

    // API documentation links
    docs: {
      api: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice',
      oauth: 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization',
      webhooks: 'https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks',
    },
  },

  // ===========================================================================
  // STRIPE
  // ===========================================================================
  stripe: {
    displayName: 'Stripe',
    description: 'Process payments and manage subscriptions',
    category: 'payments',

    // Not OAuth based - uses API keys
    oauth: null,

    // API key configuration
    apiKey: {
      envVar: 'STRIPE_SECRET_KEY',
      testPrefix: 'sk_test_',
      livePrefix: 'sk_live_',
      instructions: 'Enter your Stripe secret key from the Stripe Dashboard → Developers → API keys',
    },

    // Webhook configuration
    webhook: {
      signatureHeader: 'stripe-signature',
      verifier: WEBHOOK_VERIFIERS.STRIPE,
      envVar: 'STRIPE_WEBHOOK_SECRET',
      // Stripe includes timestamp - has replay protection
      hasReplayProtection: true,
      toleranceSeconds: 300, // 5 minute tolerance
    },

    // Operations this provider supports
    capabilities: [
      'createPaymentIntent',
      'syncPayment',
    ],

    // All env vars this provider needs
    envVars: [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ],

    // API documentation links
    docs: {
      api: 'https://stripe.com/docs/api',
      webhooks: 'https://stripe.com/docs/webhooks',
    },
  },
};

// ===========================================================================
// ACCESSOR FUNCTIONS
// ===========================================================================

/**
 * Get all provider names
 * @returns {string[]}
 */
function getProviderNames() {
  return Object.keys(PROVIDERS);
}

/**
 * Get provider config by name
 * @param {string} name - Provider name
 * @returns {Object|null}
 */
function getProvider(name) {
  return PROVIDERS[name] || null;
}

/**
 * Check if a provider exists
 * @param {string} name - Provider name
 * @returns {boolean}
 */
function hasProvider(name) {
  return name in PROVIDERS;
}

/**
 * Get all OAuth-based providers
 * @returns {Object} Map of provider name -> config
 */
function getOAuthProviders() {
  return Object.fromEntries(
    Object.entries(PROVIDERS).filter(([, config]) => config.oauth !== null),
  );
}

/**
 * Get all API key-based providers
 * @returns {Object} Map of provider name -> config
 */
function getApiKeyProviders() {
  return Object.fromEntries(
    Object.entries(PROVIDERS).filter(([, config]) => config.apiKey !== null),
  );
}

/**
 * Get all providers with webhooks
 * @returns {Object} Map of provider name -> config
 */
function getWebhookProviders() {
  return Object.fromEntries(
    Object.entries(PROVIDERS).filter(([, config]) => config.webhook !== null),
  );
}

/**
 * Get provider by category
 * @param {string} category - Category name (e.g., 'accounting', 'payments')
 * @returns {Object} Map of provider name -> config
 */
function getProvidersByCategory(category) {
  return Object.fromEntries(
    Object.entries(PROVIDERS).filter(([, config]) => config.category === category),
  );
}

/**
 * Validate that required env vars are set for a provider
 * @param {string} name - Provider name
 * @returns {{ valid: boolean, missing: string[] }}
 */
function validateProviderEnv(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    return { valid: false, missing: [], error: `Unknown provider: ${name}` };
  }

  const missing = provider.envVars.filter(envVar => !process.env[envVar]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

module.exports = {
  // Constants
  OAUTH_TYPES,
  WEBHOOK_VERIFIERS,
  PROVIDERS,

  // Accessors
  getProviderNames,
  getProvider,
  hasProvider,
  getOAuthProviders,
  getApiKeyProviders,
  getWebhookProviders,
  getProvidersByCategory,
  validateProviderEnv,
};
