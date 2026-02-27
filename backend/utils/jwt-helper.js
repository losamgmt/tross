/**
 * JWT Helper - Unified JWT operations using jose library
 *
 * Replaces jsonwebtoken with jose for:
 * - Modern ES256/HS256 support
 * - Async/await API
 * - Better TypeScript support
 * - Active maintenance
 *
 * IMPORTANT: These functions are async - callers must await them.
 */
const { SignJWT, jwtVerify, decodeJwt: joseDecodeJwt } = require('jose');

// Get secret as Uint8Array for jose
const getSecret = (secret) => new TextEncoder().encode(secret || 'dev-secret-key');

/**
 * Parse time string to seconds (supports negative values for testing)
 * @param {string} timeStr - Time string like '1h', '-1h', '15m', '7d'
 * @returns {number} Seconds (can be negative)
 */
function parseTimeToSeconds(timeStr) {
  const match = timeStr.match(/^(-?\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };

  return value * multipliers[unit];
}

/**
 * Sign a JWT token with HS256 algorithm
 *
 * @param {Object} payload - Token payload (claims)
 * @param {string} secret - JWT secret
 * @param {Object} options - Options
 * @param {string} options.expiresIn - Expiration time (e.g., '24h', '15m', '7d', '-1h' for expired)
 * @returns {Promise<string>} Signed JWT token
 */
async function signJwt(payload, secret, options = {}) {
  const secretKey = getSecret(secret);

  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt();

  if (options.expiresIn) {
    // Handle negative times (for creating expired tokens in tests)
    if (options.expiresIn.startsWith('-')) {
      const seconds = parseTimeToSeconds(options.expiresIn);
      const expirationTime = Math.floor(Date.now() / 1000) + seconds;
      builder.setExpirationTime(expirationTime);
    } else {
      builder.setExpirationTime(options.expiresIn);
    }
  }

  return builder.sign(secretKey);
}

/**
 * Verify a JWT token
 *
 * @param {string} token - JWT token to verify
 * @param {string} secret - JWT secret
 * @returns {Promise<Object>} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
async function verifyJwt(token, secret) {
  const secretKey = getSecret(secret);

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    // Map jose errors to jsonwebtoken-compatible error names for backwards compatibility
    if (error.code === 'ERR_JWT_EXPIRED') {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      throw expiredError;
    }
    if (error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      const invalidError = new Error('invalid signature');
      invalidError.name = 'JsonWebTokenError';
      throw invalidError;
    }
    // For any other jose error, wrap it
    const genericError = new Error(error.message);
    genericError.name = 'JsonWebTokenError';
    throw genericError;
  }
}

/**
 * Decode a JWT token without verification (for inspection only)
 * WARNING: Do not trust the payload without verification!
 *
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded payload or null if invalid format
 */
function decodeJwt(token) {
  try {
    return joseDecodeJwt(token);
  } catch {
    return null;
  }
}

module.exports = {
  signJwt,
  verifyJwt,
  decodeJwt,
  getSecret,
};
