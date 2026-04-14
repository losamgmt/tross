'use strict';

/**
 * QuickBooks Integration Provider
 * 
 * Provider for QuickBooks Online integration.
 * Required methods: healthCheck, refreshToken
 * Optional: business operations (syncInvoice, etc.)
 */

const AppError = require('../../../utils/app-error');
const { logger } = require('../../../config/logger');

// QuickBooks API base URLs
const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3';
const QB_OAUTH_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QB_SANDBOX_API_BASE = 'https://sandbox-quickbooks.api.intuit.com/v3';

/**
 * Get the appropriate API base URL
 * @returns {string}
 */
function getApiBase() {
  return process.env.NODE_ENV === 'production' ? QB_API_BASE : QB_SANDBOX_API_BASE;
}

/**
 * REQUIRED: Health check - verify connectivity with QuickBooks
 * @param {Object} tokens - Access tokens
 * @returns {Promise<boolean>} true if healthy
 */
async function healthCheck(tokens) {
  try {
    const response = await fetch(
      `${getApiBase()}/company/${tokens.realm_id}/companyinfo/${tokens.realm_id}`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );
    return response.ok;
  } catch (error) {
    logger.warn('QuickBooks health check failed', { error: error.message });
    return false;
  }
}

/**
 * REQUIRED: Refresh the OAuth access token
 * @param {string} refreshTokenValue - Refresh token
 * @returns {Promise<Object>} New tokens object
 */
async function refreshToken(refreshTokenValue) {
  const response = await fetch(QB_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
      client_id: process.env.QB_CLIENT_ID,
      client_secret: process.env.QB_CLIENT_SECRET,
    }),
  });
  
  if (!response.ok) {
    throw new AppError('QuickBooks token refresh failed', 401, 'TOKEN_REFRESH_FAILED');
  }
  
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    token_type: data.token_type,
  };
}

/**
 * OPTIONAL: Sync an invoice to QuickBooks
 * @param {Object} tokens - Access tokens
 * @param {Object} params - { invoice }
 * @returns {Promise<Object>} QuickBooks invoice reference
 */
async function syncInvoice(tokens, { invoice }) {
  logger.info('Syncing invoice to QuickBooks', { invoiceId: invoice.id });
  
  // TODO: Implement actual QuickBooks invoice creation
  // const response = await fetch(
  //   `${getApiBase()}/company/${tokens.realm_id}/invoice`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${tokens.access_token}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ /* QB invoice format */ }),
  //   }
  // );
  
  throw new AppError('QuickBooks syncInvoice not implemented', 501, 'NOT_IMPLEMENTED');
}

/**
 * OPTIONAL: Sync a customer to QuickBooks
 * @param {Object} tokens - Access tokens
 * @param {Object} params - { customer }
 * @returns {Promise<Object>} QuickBooks customer reference
 */
async function syncCustomer(tokens, { customer }) {
  logger.info('Syncing customer to QuickBooks', { customerId: customer.id });
  
  // TODO: Implement actual QuickBooks customer creation
  throw new AppError('QuickBooks syncCustomer not implemented', 501, 'NOT_IMPLEMENTED');
}

module.exports = {
  // Required
  healthCheck,
  refreshToken,
  // Optional operations
  syncInvoice,
  syncCustomer,
};
