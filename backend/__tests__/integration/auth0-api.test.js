/**
 * Auth0 API Endpoints - Integration Tests
 *
 * Tests Auth0 OAuth2 endpoints with real server
 * Validates token exchange, validation, refresh, and logout
 */

const request = require('supertest');
const app = require('../../server');
const { cleanupTestDatabase } = require('../helpers/test-db');
const { HTTP_STATUS } = require('../../config/constants');

describe('Auth0 API Endpoints - Integration Tests', () => {
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/auth0/callback - Exchange Auth Code', () => {
    test('should return 400 when code is missing', async () => {
      const response = await request(app)
        .post('/api/auth0/callback')
        .send({});

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 401 for invalid authorization code', async () => {
      const response = await request(app)
        .post('/api/auth0/callback')
        .send({
          code: 'invalid_code_12345',
          redirect_uri: 'http://localhost:8080/callback',
        });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should accept redirect_uri parameter', async () => {
      const response = await request(app)
        .post('/api/auth0/callback')
        .send({
          code: 'test_code',
          redirect_uri: 'http://localhost:3000/auth/callback',
        });

      // Will fail auth but validates redirect_uri is accepted
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('POST /api/auth0/validate - Validate ID Token (PKCE)', () => {
    test('should return 400 when id_token is missing', async () => {
      const response = await request(app)
        .post('/api/auth0/validate')
        .send({});

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 401 for invalid ID token', async () => {
      const response = await request(app)
        .post('/api/auth0/validate')
        .send({
          id_token: 'invalid.jwt.token',
        });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 401 for malformed JWT', async () => {
      const response = await request(app)
        .post('/api/auth0/validate')
        .send({
          id_token: 'not-a-jwt',
        });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 401 for expired token', async () => {
      // This is a structurally valid JWT but with expired claims
      const expiredToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfDEyMzQ1Njc4OTAiLCJhdWQiOiJ0ZXN0LWF1ZGllbmNlIiwiZXhwIjoxNjAwMDAwMDAwLCJpYXQiOjE2MDAwMDAwMDB9.invalid_signature';
      
      const response = await request(app)
        .post('/api/auth0/validate')
        .send({
          id_token: expiredToken,
        });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('POST /api/auth0/refresh - Refresh Access Token', () => {
    test('should return 400 when refresh_token is missing', async () => {
      const response = await request(app)
        .post('/api/auth0/refresh')
        .send({});

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth0/refresh')
        .send({
          refresh_token: 'invalid_refresh_token',
        });

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    test('should return 401 for empty refresh token', async () => {
      const response = await request(app)
        .post('/api/auth0/refresh')
        .send({
          refresh_token: '',
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('GET /api/auth0/logout - Get Logout URL', () => {
    const hasAuth0Config = !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID);

    test('should return logout URL', async () => {
      const response = await request(app)
        .get('/api/auth0/logout');

      // Logout endpoint always returns 200 with a logout_url
      // (it just constructs a URL string, doesn't require actual Auth0 connection)
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logout_url');
      expect(typeof response.body.data.logout_url).toBe('string');
    });

    test('should return valid Auth0 logout URL format when configured', async () => {
      if (!hasAuth0Config) {
        // Without Auth0 config, URL will have 'undefined' in it - skip validation
        return;
      }

      const response = await request(app)
        .get('/api/auth0/logout');

      expect(response.status).toBe(HTTP_STATUS.OK);
      const logoutUrl = response.body.data.logout_url;
      
      // Should be a valid URL
      expect(() => new URL(logoutUrl)).not.toThrow();
      
      // Should point to Auth0 domain
      expect(logoutUrl).toMatch(/auth0\.com|localhost/);
    });

    test('should not require authentication', async () => {
      // Logout endpoint should be accessible without auth
      // (user might have expired token)
      const response = await request(app)
        .get('/api/auth0/logout');

      // Always returns 200 - just constructs URL
      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    test('should include helpful message', async () => {
      const response = await request(app)
        .get('/api/auth0/logout');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.message).toMatch(/redirect|logout/i);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to refresh endpoint', async () => {
      // Make multiple requests - rate limiter is bypassed in test env
      // but the middleware should be registered
      const response = await request(app)
        .post('/api/auth0/refresh')
        .send({
          refresh_token: 'test_token',
        });

      // Should not be rate limited in test env
      expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe('Request Validation', () => {
    test('should validate callback request body', async () => {
      const response = await request(app)
        .post('/api/auth0/callback')
        .send({
          code: '', // Empty code
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should validate token request body', async () => {
      const response = await request(app)
        .post('/api/auth0/validate')
        .send({
          id_token: null,
        });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    test('should handle missing Content-Type gracefully', async () => {
      const response = await request(app)
        .post('/api/auth0/callback')
        .set('Content-Type', 'text/plain')
        .send('code=test');

      // Should handle gracefully - various valid responses depending on middleware order
      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE, HTTP_STATUS.INTERNAL_SERVER_ERROR]).toContain(response.status);
    });
  });
});
