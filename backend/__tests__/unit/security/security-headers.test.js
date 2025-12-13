/**
 * Security Headers Tests
 *
 * Tests security headers configuration:
 * - Content Security Policy (CSP)
 * - HSTS
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - CORS configuration
 */

const request = require('supertest');
const express = require('express');
const { securityHeaders } = require('../../../middleware/security');

describe('Security Headers', () => {
  describe('Development Environment Headers', () => {
    let app;

    beforeEach(() => {
      // Ensure we're in development/test mode
      process.env.NODE_ENV = 'test';

      app = express();
      app.use(securityHeaders());
      app.get('/api/test', (req, res) => res.json({ success: true }));
    });

    test('should include X-Content-Type-Options: nosniff', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should include X-Frame-Options header', async () => {
      const response = await request(app).get('/api/test');

      // Helmet sets either DENY or SAMEORIGIN
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
    });

    test('should include Content-Security-Policy header', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('CSP should include default-src directive', async () => {
      const response = await request(app).get('/api/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toMatch(/default-src/);
    });

    test('CSP should restrict object-src to none', async () => {
      const response = await request(app).get('/api/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toMatch(/object-src 'none'/);
    });

    test('CSP should restrict frame-src to none', async () => {
      const response = await request(app).get('/api/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toMatch(/frame-src 'none'/);
    });

    test('should include X-DNS-Prefetch-Control header', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    test('should include X-Download-Options header', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-download-options']).toBe('noopen');
    });

    test('should include X-XSS-Protection header', async () => {
      const response = await request(app).get('/api/test');

      // Modern helmet disables this (0) as CSP is preferred
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Content Security Policy Directives', () => {
    let app;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      app = express();
      app.use(securityHeaders());
      app.get('/api/test', (req, res) => res.json({ success: true }));
    });

    test('CSP should allow self for scripts', async () => {
      const response = await request(app).get('/api/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toMatch(/script-src[^;]*'self'/);
    });

    test('CSP should include font-src directive', async () => {
      const response = await request(app).get('/api/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toMatch(/font-src/);
    });

    test('CSP should include media-src directive', async () => {
      const response = await request(app).get('/api/test');
      const csp = response.headers['content-security-policy'];

      expect(csp).toMatch(/media-src/);
    });
  });

  describe('Header Security Against Common Attacks', () => {
    let app;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      app = express();
      app.use(securityHeaders());
      app.get('/api/test', (req, res) => res.json({ success: true }));
    });

    test('should not expose server information', async () => {
      const response = await request(app).get('/api/test');

      // X-Powered-By should be removed
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should prevent clickjacking with X-Frame-Options', async () => {
      const response = await request(app).get('/api/test');

      const frameOptions = response.headers['x-frame-options'];
      expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions);
    });

    test('should prevent MIME type sniffing', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Response Headers Completeness', () => {
    let app;

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      app = express();
      app.use(securityHeaders());
      app.get('/api/test', (req, res) => res.json({ success: true }));
    });

    test('should have all essential security headers', async () => {
      const response = await request(app).get('/api/test');

      const essentialHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'content-security-policy',
        'x-dns-prefetch-control',
      ];

      essentialHeaders.forEach((header) => {
        expect(response.headers[header]).toBeDefined();
      });
    });

    test('JSON response should have correct content-type', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
