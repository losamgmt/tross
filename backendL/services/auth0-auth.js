/**
 * Auth0 Authentication Service
 */
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const { AuthenticationClient, ManagementClient } = require('auth0');
const { logger } = require('../config/logger');
const { UserDataService } = require('./user-data');
const auth0Config = require('../config/auth0');

class Auth0Auth {
  constructor() {
    this.config = auth0Config;
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
   * Get provider name for identification
   */
  getProviderName() {
    return 'auth0';
  }

  /**
   * Get user profile from Auth0 (useful for refreshing user data)
   *
   * DEFENSIVE: Validates all Auth0 API response fields
   */
  async getUserProfile(token) {
    try {
      const userInfo = await this.authClient.users.getInfo(token);

      // VALIDATE: Auth0 external API response data
      return {
        id: toSafeString(userInfo.sub, 'auth0.sub', { minLength: 1 }),
        email: toSafeEmail(userInfo.email, 'auth0.email'),
        name: toSafeString(userInfo.name, 'auth0.name', { allowNull: true }),
        picture: toSafeString(userInfo.picture, 'auth0.picture', {
          allowNull: true,
        }),
        email_verified: userInfo.email_verified === true, // Coerce to boolean
      };
    } catch (error) {
      logger.error('Failed to get user profile from Auth0', {
        error: error.message,
      });
      throw new Error(`Profile retrieval failed: ${error.message}`);
    }
  }

  /**
   * Logout - return logout URL for client to redirect to
   */
  async logout() {
    const returnToUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;
    const logoutUrl = this.getLogoutUrl(returnToUrl);

    logger.info('Auth0 logout URL generated', { returnToUrl });
    return {
      success: true,
      logoutUrl,
      message: 'Redirect to logout URL to complete Auth0 logout',
    };
  }

  /**
   * OAuth2 Authorization Code Flow - Exchange code for tokens and authenticate user
   */
  async authenticate(credentials) {
    try {
      if (!credentials.code) {
        throw new Error('Authorization code is required');
      }

      // Use provided redirect_uri or fall back to config
      const redirectUri = credentials.redirect_uri || this.config.callbackUrl;

      // Auth0 v4 SDK - exchange authorization code for tokens using axios
      // Note: The SDK's oauth.authorizationCodeGrant() doesn't exist, so we use direct HTTP
      const response = await axios.post(
        `https://${this.config.domain}/oauth/token`,
        {
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: credentials.code,
          redirect_uri: redirectUri,
        },
      );

      const tokenResponse = response.data;
      const _decodedToken = await this.verifyToken(tokenResponse.access_token);
      const userInfo = await this.authClient.users.getInfo(
        tokenResponse.access_token,
      );

      // VALIDATE: Auth0 userInfo before using
      const validatedUserInfo = {
        sub: toSafeString(userInfo.sub, 'auth0.sub', { minLength: 1 }),
        email: toSafeEmail(userInfo.email, 'auth0.email'),
        name: toSafeString(userInfo.name, 'auth0.name', { allowNull: true }),
        given_name: toSafeString(userInfo.given_name, 'auth0.given_name', {
          allowNull: true,
        }),
        family_name: toSafeString(userInfo.family_name, 'auth0.family_name', {
          allowNull: true,
        }),
        picture: toSafeString(userInfo.picture, 'auth0.picture', {
          allowNull: true,
        }),
        email_verified: userInfo.email_verified === true,
      };

      const localUser =
        await UserDataService.findOrCreateUser(validatedUserInfo);
      const appToken = jwt.sign(
        {
          userId: localUser.id,
          email: localUser.email,
          role: localUser.role,
          provider: 'auth0',
          auth0Id: validatedUserInfo.sub,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
      );
      logger.info('Auth0 authentication successful', {
        userId: localUser.id,
        email: localUser.email,
      });
      return {
        token: appToken,
        user: localUser,
        auth0Tokens: {
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_in: tokenResponse.expires_in,
        },
      };
    } catch (error) {
      logger.error('Auth0 authentication failed', {
        error: error.message,
        code: credentials.code ? 'provided' : 'missing',
      });
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async verifyToken(token) {
    return new Promise((resolve, reject) => {
      const getKey = (header, callback) => {
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) {
            return callback(err);
          }
          const signingKey = key.publicKey || key.rsaPublicKey;
          callback(null, signingKey);
        });
      };
      jwt.verify(
        token,
        getKey,
        {
          audience: this.config.audience,
          issuer: `https://${this.config.domain}/`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }

  getAuthorizationUrl(state) {
    return this.authClient.buildAuthorizeUrl({
      responseType: 'code',
      redirectUri: this.config.callbackUrl,
      scope: 'openid profile email',
      state: state,
    });
  }

  async refreshToken(refreshToken) {
    try {
      const response = await this.authClient.oauth.refreshToken({
        refresh_token: refreshToken,
      });
      return response;
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  getLogoutUrl(returnToUrl) {
    return `https://${this.config.domain}/v2/logout?client_id=${this.config.clientId}&returnTo=${encodeURIComponent(returnToUrl)}`;
  }

  async createAdminUser(userData) {
    try {
      const user = await this.managementClient.createUser({
        connection: 'Username-Password-Authentication',
        email: userData.email,
        password: userData.password,
        email_verified: true,
        app_metadata: {
          role: 'admin',
        },
        user_metadata: {
          name: userData.name,
        },
      });
      logger.info('Admin user created in Auth0', {
        userId: user.user_id,
        email: user.email,
      });
      return user;
    } catch (error) {
      logger.error('Failed to create admin user in Auth0', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = Auth0Auth;
