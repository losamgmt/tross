'use strict';

/**
 * Stripe Integration Provider
 * 
 * Provider for Stripe payment integration.
 * Required methods: healthCheck, refreshToken
 * Optional: business operations (syncPayment, etc.)
 * 
 * Note: Stripe uses API keys, not OAuth tokens.
 * The refreshToken method is a no-op that returns the existing tokens.
 */

const AppError = require('../../../utils/app-error');
const { logger } = require('../../../config/logger');

// Stripe API base URL
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * REQUIRED: Health check - verify connectivity with Stripe
 * @param {Object} tokens - Access tokens (contains api_key)
 * @returns {Promise<boolean>} true if healthy
 */
async function healthCheck(tokens) {
  try {
    const response = await fetch(`${STRIPE_API_BASE}/balance`, {
      headers: {
        Authorization: `Bearer ${tokens.api_key || tokens.access_token}`,
      },
    });
    return response.ok;
  } catch (error) {
    logger.warn('Stripe health check failed', { error: error.message });
    return false;
  }
}

/**
 * REQUIRED: Refresh tokens
 * 
 * Note: Stripe uses API keys which don't expire, so this is a no-op.
 * Keeping the method for interface compliance.
 * 
 * @param {string} _refreshTokenValue - Not used for Stripe
 * @returns {Promise<Object>} Same tokens (no refresh needed)
 */
async function refreshToken(_refreshTokenValue) {
  // Stripe API keys don't expire - this is a no-op
  // The runner will pass the existing tokens back
  logger.debug('Stripe token refresh: API keys do not expire');
  
  // Return null to indicate no change - caller will use existing tokens
  return null;
}

/**
 * OPTIONAL: Create a payment intent
 * @param {Object} tokens - Access tokens
 * @param {Object} params - { amount, currency, metadata }
 * @returns {Promise<Object>} Stripe payment intent
 */
async function createPaymentIntent(tokens, { amount, currency = 'usd', metadata = {} }) {
  logger.info('Creating Stripe payment intent', { amount, currency });
  
  const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.api_key || tokens.access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: String(amount),
      currency,
      ...Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, v])
      ),
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new AppError(
      `Stripe payment intent failed: ${error.error?.message || 'Unknown error'}`,
      response.status,
      'STRIPE_PAYMENT_FAILED'
    );
  }
  
  return response.json();
}

/**
 * OPTIONAL: Sync a payment from Tross to Stripe
 * @param {Object} tokens - Access tokens
 * @param {Object} params - { payment }
 * @returns {Promise<Object>} Stripe reference
 */
async function syncPayment(tokens, { payment }) {
  logger.info('Syncing payment to Stripe', { paymentId: payment.id });
  
  // TODO: Implement payment sync logic
  throw new AppError('Stripe syncPayment not implemented', 501, 'NOT_IMPLEMENTED');
}

module.exports = {
  // Required
  healthCheck,
  refreshToken,
  // Optional operations
  createPaymentIntent,
  syncPayment,
};
