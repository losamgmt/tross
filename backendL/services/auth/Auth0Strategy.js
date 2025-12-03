/**
 * Auth0 Authentication Strategy
 *
 * Production OAuth2/OIDC authentication using Auth0.
 * Implements AuthStrategy interface for the Strategy Pattern.
 */
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const { AuthenticationClient, ManagementClient } = require('auth0');
const AuthStrategy = require('./AuthStrategy');
const { logger } = require('../../config/logger');
const { UserDataService } = require('../user-data');
const auth0Config = require('../../config/auth0');
const { toSafeString, toSafeEmail } = require('../../validators');

class Auth0Strategy extends AuthStrategy {
  constructor() {
    super();
    this.config = auth0Config;

    // Auth0 SDK clients
    this.authClient = new AuthenticationClient({
      domain: this.config.domain,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    });

    this.managementClient = new ManagementClient({
      domain: this.config.domain,
      clientId: this.config.managementClientId,
      clientSecret: this.config.managementClientSecret,
      scope: 'read:users create:users update:users',
    });

    // JWKS client for token verification
    this.jwksClient = jwksClient({
      jwksUri: `https://${this.config.domain}/.well-known/jwks.json`,
      requestHeaders: {},
      timeout: 30000,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksRequestsPerHour: 20,
    });
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    return 'auth0';
  }

  /**
   * Authenticate user with Auth0 authorization code
   * Exchanges authorization code for tokens and creates/updates local user
   *
   * @param {Object} credentials - {code: string, redirect_uri?: string}
   * @returns {Promise<{token: string, user: Object, auth0Tokens: Object}>}
   */
  async authenticate(credentials) {
    try {
      if (!credentials.code) {
        throw new Error('Authorization code is required');
      }

      const redirectUri = credentials.redirect_uri || this.config.callbackUrl;

      // Exchange authorization code for tokens using direct HTTP (Auth0 SDK method doesn't exist)
      logger.info('🔐 Auth0: Exchanging authorization code for tokens');
      const tokenResponse = await axios.post(
        `https://${this.config.domain}/oauth/token`,
        {
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: credentials.code,
          redirect_uri: redirectUri,
        },
      );

      const tokens = tokenResponse.data;

      // Verify the access token
      const _decodedToken = await this.verifyToken(tokens.access_token);

      // Get user info from Auth0
      const userInfo = await this.authClient.users.getInfo(tokens.access_token);
      logger.info('🔐 Auth0: Retrieved user info', { email: userInfo.email });

      // Map and create/update user in local database
      const mappedProfile = this._mapUserProfile(userInfo);
      const localUser = await UserDataService.findOrCreateUser(mappedProfile);

      // Generate application JWT token (DRY helper)
      const appToken = this._generateAppToken(
        localUser,
        mappedProfile.auth0_id,
      );

      logger.info('🔐 Auth0: Authentication successful', {
        userId: localUser.id,
        email: localUser.email,
        role: localUser.role,
      });

      return {
        token: appToken,
        user: localUser,
        auth0Tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          id_token: tokens.id_token,
          expires_in: tokens.expires_in,
        },
      };
    } catch (error) {
      logger.error('🔐 Auth0: Authentication failed', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Auth0 authentication failed: ${error.message}`);
    }
  }

  /**
   * Verify Auth0 JWT token
   * @param {string} token - Auth0 access token
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyToken(token) {
    return this._verifyJwtToken(token, this.config.audience);
  }

  /**
   * Verify Auth0 ID token (uses client_id as audience, not API audience)
   * @param {string} token - ID token to verify
   * @returns {Promise<Object>} Decoded token
   */
  async verifyIdToken(token) {
    // ID tokens use client_id as audience (not API audience)
    return this._verifyJwtToken(token, this.config.clientId);
  }

  /**
   * Get user profile from Auth0
   * @param {string} accessToken - Auth0 access token
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(accessToken) {
    try {
      const userInfo = await this.authClient.users.getInfo(accessToken);
      return this._mapUserProfile(userInfo);
    } catch (error) {
      logger.error('🔐 Auth0: Failed to get user profile', {
        error: error.message,
      });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Auth0 refresh token
   * @returns {Promise<{token: string, expires_in: number}>}
   */
  async refreshToken(refreshToken) {
    try {
      const response = await axios.post(
        `https://${this.config.domain}/oauth/token`,
        {
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
        },
      );

      const tokens = response.data;
      logger.info('🔐 Auth0: Token refreshed successfully');

      return {
        token: tokens.access_token,
        expires_in: tokens.expires_in,
        id_token: tokens.id_token,
      };
    } catch (error) {
      logger.error('🔐 Auth0: Token refresh failed', { error: error.message });
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Logout user from Auth0
   * @param {string} _token - Not used for Auth0 logout
   * @returns {Promise<{logoutUrl: string}>}
   */
  async logout(_token) {
    try {
      const returnToUrl =
        process.env.AUTH0_LOGOUT_URL || 'http://localhost:8080';
      const logoutUrl = `https://${this.config.domain}/v2/logout?client_id=${this.config.clientId}&returnTo=${encodeURIComponent(returnToUrl)}`;

      logger.info('🔐 Auth0: Logout URL generated', { returnToUrl });

      return {
        success: true,
        logoutUrl,
        message: 'Redirect to logout URL to complete Auth0 logout',
      };
    } catch (error) {
      logger.error('🔐 Auth0: Logout failed', { error: error.message });
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Validate Auth0 ID token (for PKCE flow from frontend)
   * @param {string} idToken - Auth0 ID token from frontend
   * @returns {Promise<{token: string, user: Object}>}
   */
  async validateIdToken(idToken) {
    try {
      // ID tokens use CLIENT_ID as audience, not the API audience
      const decoded = await this.verifyIdToken(idToken);

      // Get user info from token claims
      const userInfo = {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        given_name: decoded.given_name,
        family_name: decoded.family_name,
        picture: decoded.picture,
        email_verified: decoded.email_verified,
      };

      // Map and create/update user in local database
      const mappedProfile = this._mapUserProfile(userInfo);
      const localUser = await UserDataService.findOrCreateUser(mappedProfile);

      // Generate application JWT token (DRY helper)
      const appToken = this._generateAppToken(
        localUser,
        mappedProfile.auth0_id,
      );

      logger.info('🔐 Auth0: ID token validated successfully', {
        userId: localUser.id,
        email: localUser.email,
      });

      return {
        token: appToken,
        user: localUser,
      };
    } catch (error) {
      logger.error('🔐 Auth0: ID token validation failed', {
        error: error.message,
      });
      throw new Error(`ID token validation failed: ${error.message}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS (DRY/SRP)
  // ============================================================================

  /**
   * Generate application JWT token with RFC 7519 standard claims
   * Centralized token generation to eliminate duplication
   *
   * @private
   * @param {Object} localUser - Local user from database
   * @param {string} auth0Id - Validated Auth0 user ID (sub claim)
   * @returns {string} Signed JWT token
   */
  _generateAppToken(localUser, auth0Id) {
    return jwt.sign(
      {
        // REGISTERED CLAIMS (RFC 7519 Standard)
        iss: process.env.API_URL || 'https://api.trossapp.dev', // Issuer
        sub: auth0Id, // Subject (validated Auth0 user ID)
        aud: process.env.API_URL || 'https://api.trossapp.dev', // Audience

        // PRIVATE CLAIMS (Application-specific)
        email: localUser.email,
        role: localUser.role,
        provider: 'auth0',
        userId: localUser.id, // Database ID
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );
  }

  /**
   * Verify JWT token with JWKS (unified for access tokens and ID tokens)
   * Centralized verification logic with flexible audience parameter
   *
   * @private
   * @param {string} token - JWT token to verify
   * @param {string} audience - Expected audience (API audience or clientId)
   * @returns {Promise<Object>} Decoded token
   */
  _verifyJwtToken(token, audience) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this._getSigningKey.bind(this),
        {
          audience,
          issuer: `https://${this.config.domain}/`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            logger.error('🔐 Auth0: Token verification failed', {
              error: err.message,
            });
            return reject(
              new Error(`Token verification failed: ${err.message}`),
            );
          }
          resolve(decoded);
        },
      );
    });
  }

  /**
   * Get signing key from JWKS for token verification
   * Centralized JWKS key retrieval callback
   *
   * @private
   * @param {Object} header - JWT header
   * @param {Function} callback - Callback(err, key)
   */
  _getSigningKey(header, callback) {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        logger.error('🔐 Auth0: Failed to get signing key', {
          error: err.message,
        });
        return callback(err);
      }
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  /**
   * Map Auth0 user info to standardized profile format
   * Centralized user profile mapping for consistency
   *
   * DEFENSIVE: Validates all Auth0 API response fields before use
   *
   * @private
   * @param {Object} userInfo - Raw Auth0 user info
   * @returns {Object} Mapped user profile with validated fields
   */
  _mapUserProfile(userInfo) {
    // VALIDATE: All Auth0 external API response data
    const sub = toSafeString(userInfo.sub, 'auth0.sub', { minLength: 1 });
    const email = toSafeEmail(userInfo.email, 'auth0.email');
    const name = toSafeString(userInfo.name, 'auth0.name', { allowNull: true });
    const given_name = toSafeString(userInfo.given_name, 'auth0.given_name', {
      allowNull: true,
    });
    const family_name = toSafeString(
      userInfo.family_name,
      'auth0.family_name',
      { allowNull: true },
    );
    const picture = toSafeString(userInfo.picture, 'auth0.picture', {
      allowNull: true,
    });

    // Safe name splitting with fallback
    let first_name = given_name;
    let last_name = family_name;

    if (!first_name && name) {
      const parts = name.split(' ');
      first_name = parts[0] || null;
      last_name = parts.length > 1 ? parts.slice(1).join(' ') : null;
    }

    return {
      sub, // Required by User.findOrCreate
      auth0_id: sub, // Keep for backwards compatibility
      email,
      first_name,
      last_name,
      picture,
      email_verified: userInfo.email_verified === true, // Coerce to boolean
      provider: 'auth0',
    };
  }
}

module.exports = Auth0Strategy;
