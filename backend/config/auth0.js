/**
 * Auth0 Configuration
 * All values come from environment variables - no hardcoded domains.
 *
 * Required Environment Variables:
 * - AUTH0_DOMAIN: Your Auth0 domain (e.g., 'your-app.auth0.com')
 * - AUTH0_CLIENT_ID: Auth0 application client ID
 * - AUTH0_CLIENT_SECRET: Auth0 application client secret
 * - AUTH0_AUDIENCE: Auth0 API identifier
 * - AUTH0_CALLBACK_URL: Auth0 callback URL after login (defaults to localhost in development)
 */

const AUTH0_CONFIG = {
  // Auth0 Tenant Configuration
  TENANT: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE, // Required - no fallback
    callbackUrl:
      process.env.AUTH0_CALLBACK_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3001/api/auth/callback"
        : undefined),
  },

  // JWT Configuration for Auth0
  JWT: {
    algorithm: "RS256",
    issuer: process.env.AUTH0_DOMAIN
      ? `https://${process.env.AUTH0_DOMAIN}/`
      : null,
    audience: process.env.AUTH0_AUDIENCE, // Required - no fallback
  },

  // Auth0 API Endpoints (relative paths - domain comes from AUTH0_DOMAIN)
  ENDPOINTS: {
    token: "/oauth/token",
    userinfo: "/userinfo",
    logout: "/v2/logout",
    jwks: "/.well-known/jwks.json",
  },

  // Auth0 Scopes
  SCOPES: {
    openid: "openid",
    profile: "profile",
    email: "email",
    offline_access: "offline_access", // For refresh tokens
  },

  // Grant Types
  GRANT_TYPES: {
    authorization_code: "authorization_code",
    refresh_token: "refresh_token",
    client_credentials: "client_credentials",
  },
};

// Export flattened config for easier access
const config = {
  domain: AUTH0_CONFIG.TENANT.domain,
  clientId: AUTH0_CONFIG.TENANT.clientId,
  clientSecret: AUTH0_CONFIG.TENANT.clientSecret,
  audience: AUTH0_CONFIG.TENANT.audience,
  callbackUrl: AUTH0_CONFIG.TENANT.callbackUrl,
  jwt: AUTH0_CONFIG.JWT,
  endpoints: AUTH0_CONFIG.ENDPOINTS,
  scopes: AUTH0_CONFIG.SCOPES,
  grantTypes: AUTH0_CONFIG.GRANT_TYPES,
};

module.exports = config;
