/**
 * Auth0 Configuration
 * Production authentication configuration for Auth0 integration
 */

// Auth0 Environment Variables Documentation
const AUTH0_CONFIG = {
  // Required Environment Variables for Production
  REQUIRED_ENV: [
    'AUTH0_DOMAIN', // Your Auth0 domain (e.g., 'your-app.auth0.com')
    'AUTH0_CLIENT_ID', // Auth0 application client ID
    'AUTH0_CLIENT_SECRET', // Auth0 application client secret
    'AUTH0_AUDIENCE', // Auth0 API identifier (optional)
    'AUTH0_CALLBACK_URL', // Auth0 callback URL after login
  ],

  // Auth0 Tenant Configuration
  TENANT: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE || 'https://api.trossapp.com',
    callbackUrl:
      process.env.AUTH0_CALLBACK_URL ||
      'http://localhost:3001/api/auth/callback',
  },

  // JWT Configuration for Auth0
  JWT: {
    algorithm: 'RS256',
    issuer: process.env.AUTH0_DOMAIN
      ? `https://${process.env.AUTH0_DOMAIN}/`
      : null,
    audience: process.env.AUTH0_AUDIENCE || 'https://api.trossapp.com',
  },

  // Auth0 API Endpoints
  ENDPOINTS: {
    token: '/oauth/token',
    userinfo: '/userinfo',
    logout: '/v2/logout',
    jwks: '/.well-known/jwks.json',
  },

  // Auth0 Scopes
  SCOPES: {
    openid: 'openid',
    profile: 'profile',
    email: 'email',
    offline_access: 'offline_access', // For refresh tokens
  },

  // Grant Types
  GRANT_TYPES: {
    authorization_code: 'authorization_code',
    refresh_token: 'refresh_token',
    client_credentials: 'client_credentials',
  },
};

/**
 * Validate Auth0 configuration
 * @returns {Object} Validation result
 */
function _validateAuth0Config() {
  const missing = AUTH0_CONFIG.REQUIRED_ENV.filter((key) => !process.env[key]);

  return {
    isValid: missing.length === 0,
    missing,
    config: AUTH0_CONFIG.TENANT,
  };
}

/**
 * Get Auth0 configuration for different environments
 * @param {string} environment - Environment name (development, staging, production)
 * @returns {Object} Environment-specific configuration
 */
function _getAuth0Config(environment = 'production') {
  const baseConfig = { ...AUTH0_CONFIG };

  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        TENANT: {
          ...baseConfig.TENANT,
          callbackUrl: 'http://localhost:3001/api/auth/callback',
        },
      };

    case 'staging':
      return {
        ...baseConfig,
        TENANT: {
          ...baseConfig.TENANT,
          callbackUrl: 'https://staging-api.trossapp.com/api/auth/callback',
        },
      };

    case 'production':
      return {
        ...baseConfig,
        TENANT: {
          ...baseConfig.TENANT,
          callbackUrl: 'https://api.trossapp.com/api/auth/callback',
        },
      };

    default:
      return baseConfig;
  }
}

// Export flattened config for easier access
const config = {
  domain: AUTH0_CONFIG.TENANT.domain,
  clientId: AUTH0_CONFIG.TENANT.clientId,
  clientSecret: AUTH0_CONFIG.TENANT.clientSecret,
  audience: AUTH0_CONFIG.TENANT.audience,
  callbackUrl: AUTH0_CONFIG.TENANT.callbackUrl,
  managementClientId: AUTH0_CONFIG.TENANT.clientId, // Same as regular clientId for now
  managementClientSecret: AUTH0_CONFIG.TENANT.clientSecret, // Same for now
};

module.exports = config;
