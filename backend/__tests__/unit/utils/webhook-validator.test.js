/**
 * WebhookValidator Unit Tests
 *
 * Tests signature verification for:
 * - Generic HMAC verification
 * - Stripe-specific format (with replay attack prevention)
 * - QuickBooks-specific format (base64 encoded)
 *
 * All tests are pure (no mocks needed - no I/O, no state)
 */

const crypto = require('crypto');
const WebhookValidator = require('../../../utils/webhook-validator');

describe('WebhookValidator', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC VERIFY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verify() - Generic HMAC', () => {
    const secret = 'test-webhook-secret-key';
    const payload = '{"event":"test","data":{"id":123}}';

    // Helper to compute expected signature
    const computeSignature = (data, key, algorithm = 'sha256', encoding = 'hex') => {
      return crypto.createHmac(algorithm, key).update(data, 'utf8').digest(encoding);
    };

    test('returns true for valid signature', () => {
      const signature = computeSignature(payload, secret);

      const result = WebhookValidator.verify({ payload, signature, secret });

      expect(result).toBe(true);
    });

    test('returns false for invalid signature', () => {
      const result = WebhookValidator.verify({
        payload,
        signature: 'invalid-signature-value',
        secret,
      });

      expect(result).toBe(false);
    });

    test('returns false for tampered payload', () => {
      const signature = computeSignature(payload, secret);
      const tamperedPayload = '{"event":"test","data":{"id":999}}';

      const result = WebhookValidator.verify({
        payload: tamperedPayload,
        signature,
        secret,
      });

      expect(result).toBe(false);
    });

    test('returns false for wrong secret', () => {
      const signature = computeSignature(payload, secret);

      const result = WebhookValidator.verify({
        payload,
        signature,
        secret: 'wrong-secret',
      });

      expect(result).toBe(false);
    });

    test('returns false if payload is missing', () => {
      const result = WebhookValidator.verify({ signature: 'abc', secret: 'xyz' });
      expect(result).toBe(false);
    });

    test('returns false if signature is missing', () => {
      const result = WebhookValidator.verify({ payload: 'test', secret: 'xyz' });
      expect(result).toBe(false);
    });

    test('returns false if secret is missing', () => {
      const result = WebhookValidator.verify({ payload: 'test', signature: 'abc' });
      expect(result).toBe(false);
    });

    test('accepts empty string payload', () => {
      const signature = computeSignature('', secret);

      const result = WebhookValidator.verify({ payload: '', signature, secret });

      expect(result).toBe(true);
    });

    test('accepts Buffer payload', () => {
      const bufferPayload = Buffer.from(payload);
      const signature = computeSignature(payload, secret);

      const result = WebhookValidator.verify({
        payload: bufferPayload,
        signature,
        secret,
      });

      expect(result).toBe(true);
    });

    test('supports custom algorithm', () => {
      const signature = computeSignature(payload, secret, 'sha512');

      const result = WebhookValidator.verify({
        payload,
        signature,
        secret,
        algorithm: 'sha512',
      });

      expect(result).toBe(true);
    });

    test('supports custom encoding', () => {
      const signature = computeSignature(payload, secret, 'sha256', 'base64');

      const result = WebhookValidator.verify({
        payload,
        signature,
        secret,
        encoding: 'base64',
      });

      expect(result).toBe(true);
    });

    test('is timing-safe (same length comparison)', () => {
      // This test verifies behavior, not timing (timing tests are unreliable in JS)
      const validSig = computeSignature(payload, secret);
      const invalidSig = 'a'.repeat(validSig.length); // Same length, different value

      const result = WebhookValidator.verify({
        payload,
        signature: invalidSig,
        secret,
      });

      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRIPE-SPECIFIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verifyStripe() - Stripe Format', () => {
    const secret = 'whsec_test_secret_key';
    const payload = '{"id":"evt_123","type":"payment_intent.succeeded"}';

    // Helper to create valid Stripe signature header
    const createStripeSignature = (data, key, timestamp = Math.floor(Date.now() / 1000)) => {
      const signedPayload = `${timestamp}.${data}`;
      const signature = crypto.createHmac('sha256', key).update(signedPayload).digest('hex');
      return { header: `t=${timestamp},v1=${signature}`, timestamp };
    };

    test('returns true for valid signature within tolerance', () => {
      const { header } = createStripeSignature(payload, secret);

      const result = WebhookValidator.verifyStripe(payload, header, secret);

      expect(result).toBe(true);
    });

    test('returns false for invalid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const header = `t=${timestamp},v1=invalid_signature`;

      const result = WebhookValidator.verifyStripe(payload, header, secret);

      expect(result).toBe(false);
    });

    test('returns false for tampered payload', () => {
      const { header } = createStripeSignature(payload, secret);
      const tamperedPayload = '{"id":"evt_999","type":"hacked"}';

      const result = WebhookValidator.verifyStripe(tamperedPayload, header, secret);

      expect(result).toBe(false);
    });

    test('returns false for missing signature header', () => {
      const result = WebhookValidator.verifyStripe(payload, null, secret);

      expect(result).toBe(false);
    });

    test('returns false for missing timestamp in header', () => {
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const header = `v1=${signature}`; // Missing t=

      const result = WebhookValidator.verifyStripe(payload, header, secret);

      expect(result).toBe(false);
    });

    test('returns false for missing v1 signature in header', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const header = `t=${timestamp}`; // Missing v1=

      const result = WebhookValidator.verifyStripe(payload, header, secret);

      expect(result).toBe(false);
    });

    test('returns false for non-numeric timestamp', () => {
      const header = 't=not-a-number,v1=abc123';

      const result = WebhookValidator.verifyStripe(payload, header, secret);

      expect(result).toBe(false);
    });

    // REPLAY ATTACK PREVENTION TESTS

    test('returns false for timestamp older than tolerance (replay attack)', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const { header } = createStripeSignature(payload, secret, oldTimestamp);

      const result = WebhookValidator.verifyStripe(payload, header, secret, {
        toleranceSeconds: 300,
      });

      expect(result).toBe(false);
    });

    test('returns false for timestamp in far future', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 400 seconds in future
      const { header } = createStripeSignature(payload, secret, futureTimestamp);

      const result = WebhookValidator.verifyStripe(payload, header, secret, {
        toleranceSeconds: 300,
      });

      expect(result).toBe(false);
    });

    test('accepts timestamp within custom tolerance', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 500; // 500 seconds ago
      const { header } = createStripeSignature(payload, secret, oldTimestamp);

      // Should fail with default tolerance (300s)
      expect(
        WebhookValidator.verifyStripe(payload, header, secret, { toleranceSeconds: 300 }),
      ).toBe(false);

      // Should pass with extended tolerance (600s)
      expect(
        WebhookValidator.verifyStripe(payload, header, secret, { toleranceSeconds: 600 }),
      ).toBe(true);
    });

    test('accepts timestamp at edge of tolerance', () => {
      const edgeTimestamp = Math.floor(Date.now() / 1000) - 299; // Just within 300s
      const { header } = createStripeSignature(payload, secret, edgeTimestamp);

      const result = WebhookValidator.verifyStripe(payload, header, secret, {
        toleranceSeconds: 300,
      });

      expect(result).toBe(true);
    });

    test('uses 300 second default tolerance', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 299;
      const { header } = createStripeSignature(payload, secret, oldTimestamp);

      // Should pass - default is 300s
      const result = WebhookValidator.verifyStripe(payload, header, secret);

      expect(result).toBe(true);
    });

    test('returns false for empty payload', () => {
      const result = WebhookValidator.verifyStripe(null, 't=123,v1=abc', secret);

      expect(result).toBe(false);
    });

    test('returns false for empty secret', () => {
      const { header } = createStripeSignature(payload, secret);

      const result = WebhookValidator.verifyStripe(payload, header, '');

      expect(result).toBe(false);
    });

    test('handles malformed header gracefully', () => {
      const malformedHeaders = [
        'garbage',
        't=,v1=',
        '===',
        't=123=456,v1=abc=def',
      ];

      for (const header of malformedHeaders) {
        expect(WebhookValidator.verifyStripe(payload, header, secret)).toBe(false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICKBOOKS-SPECIFIC TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verifyQuickBooks() - QuickBooks Format', () => {
    const secret = 'qb-webhook-verifier-token';
    const payload = '{"eventNotifications":[{"dataChangeEvent":{"entities":[{"name":"Invoice"}]}}]}';

    // Helper to compute QuickBooks signature (base64)
    const computeQBSignature = (data, key) => {
      return crypto.createHmac('sha256', key).update(data, 'utf8').digest('base64');
    };

    test('returns true for valid base64 signature', () => {
      const signature = computeQBSignature(payload, secret);

      const result = WebhookValidator.verifyQuickBooks(payload, signature, secret);

      expect(result).toBe(true);
    });

    test('returns false for invalid signature', () => {
      const result = WebhookValidator.verifyQuickBooks(
        payload,
        'invalid-base64-signature',
        secret,
      );

      expect(result).toBe(false);
    });

    test('returns false for tampered payload', () => {
      const signature = computeQBSignature(payload, secret);
      const tamperedPayload = '{"hacked":true}';

      const result = WebhookValidator.verifyQuickBooks(tamperedPayload, signature, secret);

      expect(result).toBe(false);
    });

    test('returns false for missing signature', () => {
      const result = WebhookValidator.verifyQuickBooks(payload, null, secret);

      expect(result).toBe(false);
    });

    test('returns false for empty signature', () => {
      const result = WebhookValidator.verifyQuickBooks(payload, '', secret);

      expect(result).toBe(false);
    });

    test('returns false for missing payload', () => {
      const signature = computeQBSignature(payload, secret);

      const result = WebhookValidator.verifyQuickBooks(null, signature, secret);

      expect(result).toBe(false);
    });

    test('returns false for missing secret', () => {
      const signature = computeQBSignature(payload, secret);

      const result = WebhookValidator.verifyQuickBooks(payload, signature, '');

      expect(result).toBe(false);
    });

    test('handles special characters in payload', () => {
      const specialPayload = '{"message":"Hello \\"world\\" with special chars: 日本語"}';
      const signature = computeQBSignature(specialPayload, secret);

      const result = WebhookValidator.verifyQuickBooks(specialPayload, signature, secret);

      expect(result).toBe(true);
    });

    test('handles empty string payload', () => {
      const signature = computeQBSignature('', secret);

      const result = WebhookValidator.verifyQuickBooks('', signature, secret);

      expect(result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Security Properties', () => {
    test('different length signatures return false (not throw)', () => {
      const secret = 'test-secret';
      const payload = 'test-payload';
      const shortSig = 'abc';
      const longSig = 'a'.repeat(1000);

      // Should return false, not throw
      expect(
        WebhookValidator.verify({ payload, signature: shortSig, secret }),
      ).toBe(false);
      expect(
        WebhookValidator.verify({ payload, signature: longSig, secret }),
      ).toBe(false);
    });

    test('valid signature passes verification', () => {
      const secret = 'test-secret';
      const payload = 'test-payload';

      const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      // Verify that a correctly computed signature passes
      expect(
        WebhookValidator.verify({ payload, signature: validSig, secret }),
      ).toBe(true);
    });

    test('signatures are case-sensitive', () => {
      const secret = 'test-secret';
      const payload = 'test-payload';
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const upperSignature = signature.toUpperCase();

      // Original should pass
      expect(
        WebhookValidator.verify({ payload, signature, secret }),
      ).toBe(true);

      // Uppercase should fail (hex is lowercase)
      expect(
        WebhookValidator.verify({ payload, signature: upperSignature, secret }),
      ).toBe(false);
    });
  });
});
