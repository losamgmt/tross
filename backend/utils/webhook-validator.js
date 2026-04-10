/**
 * Webhook Signature Validator
 *
 * SRP LITERALISM: ONLY verifies HMAC signatures
 *
 * PHILOSOPHY:
 * - GENERIC: Works with any HMAC-based signature scheme
 * - SECURE: Timing-safe comparison (prevents timing attacks)
 * - PURE: No side effects, no I/O, no state
 * - TESTABLE: Pure functions, deterministic output
 *
 * USAGE:
 *   const WebhookValidator = require('../utils/webhook-validator');
 *
 *   // Generic HMAC verification
 *   const isValid = WebhookValidator.verify({
 *     payload: rawBody,
 *     signature: req.headers['x-signature'],
 *     secret: process.env.WEBHOOK_SECRET,
 *   });
 *
 *   // Stripe-specific (with replay attack prevention)
 *   const isValid = WebhookValidator.verifyStripe(
 *     rawBody,
 *     req.headers['stripe-signature'],
 *     process.env.STRIPE_WEBHOOK_SECRET
 *   );
 *
 *   // QuickBooks-specific (base64 encoded)
 *   const isValid = WebhookValidator.verifyQuickBooks(
 *     rawBody,
 *     req.headers['intuit-signature'],
 *     process.env.QB_WEBHOOK_VERIFIER_TOKEN
 *   );
 */

const crypto = require('crypto');

/**
 * Compute HMAC signature
 * @private
 * @param {string|Buffer} payload - Data to sign
 * @param {string} secret - Signing secret
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {string} Hex-encoded HMAC
 */
function computeHmac(payload, secret, algorithm = 'sha256') {
  return crypto
    .createHmac(algorithm, secret)
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 * @private
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * WebhookValidator - Verify webhook signatures from external services
 */
class WebhookValidator {
  /**
   * Generic HMAC signature verification
   *
   * @param {Object} options - Verification options
   * @param {string|Buffer} options.payload - Raw request body
   * @param {string} options.signature - Signature from header
   * @param {string} options.secret - Webhook signing secret
   * @param {string} [options.algorithm='sha256'] - Hash algorithm
   * @param {string} [options.encoding='hex'] - Signature encoding
   * @returns {boolean} True if signature is valid, false otherwise
   */
  static verify({ payload, signature, secret, algorithm = 'sha256', encoding = 'hex' }) {
    // Return false for missing inputs (consistent with verifyStripe/verifyQuickBooks)
    // This allows callers to handle invalid webhooks uniformly
    if (!payload && payload !== '') return false;
    if (!signature) return false;
    if (!secret) return false;

    // NOTE: Not using computeHmac() helper because it's hardcoded to 'hex' encoding.
    // This method supports custom encodings (e.g., 'base64'), so we compute inline.
    const computed = crypto
      .createHmac(algorithm, secret)
      .update(payload, 'utf8')
      .digest(encoding);

    return secureCompare(computed, signature);
  }

  /**
   * Stripe-specific signature verification
   *
   * Handles Stripe's "t=timestamp,v1=signature" format.
   * Includes replay attack prevention via timestamp validation.
   *
   * @param {string} payload - Raw request body
   * @param {string} signatureHeader - Stripe-Signature header value
   * @param {string} secret - Stripe webhook secret (whsec_...)
   * @param {Object} [options] - Verification options
   * @param {number} [options.toleranceSeconds=300] - Max event age in seconds (default: 5 min)
   * @returns {boolean} True if signature valid and timestamp within tolerance
   */
  static verifyStripe(payload, signatureHeader, secret, { toleranceSeconds = 300 } = {}) {
    if (!signatureHeader) return false;
    if (!payload && payload !== '') return false;
    if (!secret) return false;

    // Parse Stripe signature format: t=1234567890,v1=abc123...
    const parts = signatureHeader.split(',').reduce((acc, part) => {
      const [key, ...valueParts] = part.split('=');
      acc[key] = valueParts.join('='); // Handle '=' in value
      return acc;
    }, {});

    if (!parts.t || !parts.v1) return false;

    // SECURITY: Validate timestamp to prevent replay attacks
    // Stripe includes timestamp in signature, so attacker can't modify it
    const timestamp = parseInt(parts.t, 10);
    if (isNaN(timestamp)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false; // Event too old or in future - reject
    }

    // Stripe signs: timestamp + '.' + payload
    const signedPayload = `${parts.t}.${payload}`;
    const expected = computeHmac(signedPayload, secret);

    return secureCompare(expected, parts.v1);
  }

  /**
   * QuickBooks-specific signature verification
   *
   * QuickBooks uses HMAC-SHA256 with base64 encoding.
   *
   * SECURITY NOTE: QuickBooks webhooks do NOT include timestamps, so there is
   * no replay attack prevention at the signature level. Consumers should:
   * 1. Use idempotency keys to prevent duplicate processing
   * 2. Track processed webhook IDs in the database
   * 3. Consider short-lived processing windows for sensitive operations
   *
   * @param {string} payload - Raw request body
   * @param {string} signature - intuit-signature header value
   * @param {string} secret - QuickBooks webhook verifier token
   * @returns {boolean} True if signature is valid
   */
  static verifyQuickBooks(payload, signature, secret) {
    if (!signature) return false;
    if (!payload && payload !== '') return false;
    if (!secret) return false;

    const computed = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');

    return secureCompare(computed, signature);
  }
}

module.exports = WebhookValidator;
