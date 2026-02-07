/**
 * Artillery Load Test Helper Functions
 *
 * Provides dynamic test data and token generation for load testing.
 */

const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// Cache tokens to avoid hammering token endpoint
let cachedTokens = {};

/**
 * Generate admin token
 */
async function generateAdminToken(context, events, done) {
  if (cachedTokens.admin && Date.now() - cachedTokens.admin.timestamp < 60000) {
    context.vars.adminToken = cachedTokens.admin.token;
    return done();
  }

  try {
    const response = await axios.get(`${BACKEND_URL}/api/dev/token?role=admin`);
    const token = response.data.token;

    cachedTokens.admin = { token, timestamp: Date.now() };
    context.vars.adminToken = token;
    done();
  } catch (error) {
    console.error("Failed to generate admin token:", error.message);
    done(error);
  }
}

/**
 * Generate dispatcher token
 */
async function generateDispatcherToken(context, events, done) {
  if (
    cachedTokens.dispatcher &&
    Date.now() - cachedTokens.dispatcher.timestamp < 60000
  ) {
    context.vars.dispatcherToken = cachedTokens.dispatcher.token;
    return done();
  }

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/dev/token?role=dispatcher`,
    );
    const token = response.data.token;

    cachedTokens.dispatcher = { token, timestamp: Date.now() };
    context.vars.dispatcherToken = token;
    done();
  } catch (error) {
    console.error("Failed to generate dispatcher token:", error.message);
    done(error);
  }
}

/**
 * Generate customer token
 */
async function generateCustomerToken(context, events, done) {
  if (
    cachedTokens.customer &&
    Date.now() - cachedTokens.customer.timestamp < 60000
  ) {
    context.vars.customerToken = cachedTokens.customer.token;
    return done();
  }

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/dev/token?role=customer`,
    );
    const token = response.data.token;

    cachedTokens.customer = { token, timestamp: Date.now() };
    context.vars.customerToken = token;
    done();
  } catch (error) {
    console.error("Failed to generate customer token:", error.message);
    done(error);
  }
}

/**
 * Get a test customer ID for work orders
 */
async function getTestCustomerId(context, events, done) {
  try {
    const token = context.vars.adminToken;
    const response = await axios.get(
      `${BACKEND_URL}/api/customers?page=1&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.data.data && response.data.data.length > 0) {
      context.vars.customerId = response.data.data[0].id;
    } else {
      // Fallback to a default ID
      context.vars.customerId = 1;
    }
    done();
  } catch (error) {
    console.error("Failed to get test customer:", error.message);
    context.vars.customerId = 1;
    done();
  }
}

/**
 * Get a test work order ID for updates
 */
async function getTestWorkOrderId(context, events, done) {
  try {
    const token = context.vars.customerToken || context.vars.adminToken;
    const response = await axios.get(
      `${BACKEND_URL}/api/work_orders?page=1&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.data.data && response.data.data.length > 0) {
      context.vars.workOrderId = response.data.data[0].id;
    } else {
      context.vars.workOrderId = null;
    }
    done();
  } catch (error) {
    console.error("Failed to get test work order:", error.message);
    context.vars.workOrderId = null;
    done();
  }
}

/**
 * Legacy log function for backward compatibility
 */
function logHeaders(requestParams, context, ee, next) {
  console.log("Testing Tross API endpoints...");
  return next();
}

module.exports = {
  logHeaders,
  generateAdminToken,
  generateDispatcherToken,
  generateCustomerToken,
  getTestCustomerId,
  getTestWorkOrderId,
};
