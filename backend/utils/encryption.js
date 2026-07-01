/**
 * AES-256-GCM authenticated encryption for sensitive data at rest.
 *
 * Primary use: integration OAuth tokens stored in `system_settings`
 * (see services/integrations/token-service.js). Kept generic so any
 * secret-at-rest can reuse it.
 *
 * Payload format (versioned + self-describing so the algorithm can be
 * rotated later without ambiguity):
 *
 *   v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
 *
 * Guarantees:
 * - Confidentiality: AES-256 in GCM mode.
 * - Integrity/authenticity: GCM auth tag; decrypt() throws on any tampering.
 * - Nonce uniqueness: a fresh 12-byte random IV per encryption.
 *
 * Key: 32 bytes supplied as ENCRYPTION_KEY (64 hex chars). Resolved lazily
 * through the env manifest, so dev/test receive a deterministic default while
 * production fails closed (throws) the moment something tries to encrypt
 * without a real key configured.
 *
 * SRP: symmetric-crypto primitives ONLY — no storage, no domain logic.
 */

const crypto = require('crypto');
const { getEnvValue } = require('../config/env-manifest');

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12; // GCM-recommended nonce length
const KEY_HEX_PATTERN = /^[0-9a-fA-F]{64}$/; // 32 bytes as hex

/**
 * Resolve the 32-byte encryption key from ENCRYPTION_KEY (hex).
 * @returns {Buffer} 32-byte key
 * @throws {Error} If the key is missing or not 64 hex characters.
 */
function _getKey() {
  const hex = getEnvValue('ENCRYPTION_KEY');
  if (typeof hex !== 'string' || !KEY_HEX_PATTERN.test(hex)) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes) for AES-256-GCM',
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a UTF-8 string.
 * @param {string} plaintext - The value to encrypt.
 * @returns {string} Versioned payload: `v1:<iv>:<tag>:<ciphertext>` (base64 parts).
 * @throws {TypeError} If plaintext is not a string.
 */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt() expects a string');
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, _getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a payload produced by encrypt(). Verifies integrity via the auth tag.
 * @param {string} payload - A `v1:<iv>:<tag>:<ciphertext>` string.
 * @returns {string} The original plaintext.
 * @throws {Error} If the payload is malformed, an unsupported version, or
 *   tampered with (auth-tag mismatch / wrong key).
 */
function decrypt(payload) {
  if (typeof payload !== 'string') {
    throw new TypeError('decrypt() expects a string');
  }
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Unrecognized or unsupported encryption payload format');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    _getKey(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(), // throws on auth-tag mismatch (tampered data or wrong key)
  ]);
  return plaintext.toString('utf8');
}

/**
 * Test whether a value looks like a payload produced by encrypt().
 * @param {unknown} value
 * @returns {boolean} True if value is a `v1:`-prefixed encryption payload.
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`);
}

module.exports = { encrypt, decrypt, isEncrypted };
