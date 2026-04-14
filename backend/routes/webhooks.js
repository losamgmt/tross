'use strict';

/**
 * Webhook Routes - Generic Webhook Receiver
 *
 * PATTERN: Metadata-driven webhook handling
 * - Signature verification uses WebhookValidator
 * - Provider config from config/integration-providers.js
 * - Adding a new webhook requires NO changes to this file
 *
 * SECURITY:
 * - No authentication (webhooks are public endpoints)
 * - Signature verification is MANDATORY
 * - Raw body required for signature verification
 * - Idempotency tracking prevents duplicate processing
 *
 * ROUTES:
 * POST /webhooks/:provider - Receive webhook events
 */

const express = require('express');
const WebhookValidator = require('../utils/webhook-validator');
const { logger, logSecurityEvent } = require('../config/logger');
const {
  getProvider,
  getWebhookProviders,
  WEBHOOK_VERIFIERS,
} = require('../config/integration-providers');

/**
 * Webhook event queue (in-memory for now)
 * In production, use Redis/RabbitMQ/SQS
 */
const eventQueue = [];

/**
 * Processed event IDs for idempotency (in-memory)
 * In production, use database
 */
const processedEvents = new Set();

/**
 * Extract event ID from webhook payload based on provider
 * @param {string} providerName - Provider name
 * @param {Object} payload - Parsed webhook payload
 * @returns {string|null} Event ID or null
 */
function extractEventId(providerName, payload) {
  switch (providerName) {
    case 'stripe':
      return payload.id; // Stripe events have 'id' field
    case 'quickbooks':
      // QuickBooks webhooks have eventNotifications with unique IDs
      return payload.eventNotifications?.[0]?.realmId + '_' +
             payload.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.id;
    default:
      return null;
  }
}

/**
 * Queue a webhook event for processing
 * @param {string} providerName - Provider name
 * @param {Object} event - Parsed event payload
 * @param {Object} metadata - Additional metadata
 */
function queueEvent(providerName, event, metadata = {}) {
  eventQueue.push({
    provider: providerName,
    event,
    metadata,
    receivedAt: new Date().toISOString(),
    status: 'pending',
  });

  logger.info('Webhook event queued', {
    provider: providerName,
    eventType: event.type || event.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0]?.operation,
    queueLength: eventQueue.length,
  });
}

/**
 * Create a webhook router for a specific provider
 *
 * @param {string} providerName - Provider name
 * @returns {express.Router} Configured router for webhook
 */
function createWebhookRouter(providerName) {
  const router = express.Router();
  const providerConfig = getProvider(providerName);

  if (!providerConfig?.webhook) {
    throw new Error(`Provider ${providerName} does not support webhooks`);
  }

  const webhookConfig = providerConfig.webhook;

  // CRITICAL: Raw body parser for signature verification
  // Must be applied BEFORE any other middleware
  router.use(express.raw({ type: 'application/json' }));

  /**
   * POST / - Receive webhook events
   */
  router.post('/', async (req, res) => {
    const startTime = Date.now();

    try {
      // Get signature from header
      const signature = req.headers[webhookConfig.signatureHeader.toLowerCase()];

      if (!signature) {
        logger.warn('Webhook missing signature header', {
          provider: providerName,
          expectedHeader: webhookConfig.signatureHeader,
        });
        return res.status(401).json({ error: 'Missing signature' });
      }

      // Get webhook secret from env
      const secret = process.env[webhookConfig.envVar];

      if (!secret) {
        logger.error('Webhook secret not configured', {
          provider: providerName,
          envVar: webhookConfig.envVar,
        });
        return res.status(503).json({ error: 'Webhook not configured' });
      }

      // Get raw body (Buffer from express.raw())
      const rawBody = req.body;

      // Verify signature using appropriate verifier
      let isValid = false;

      switch (webhookConfig.verifier) {
        case WEBHOOK_VERIFIERS.STRIPE:
          isValid = WebhookValidator.verifyStripe(
            rawBody.toString(),
            signature,
            secret,
            { toleranceSeconds: webhookConfig.toleranceSeconds || 300 },
          );
          break;

        case WEBHOOK_VERIFIERS.QUICKBOOKS:
          isValid = WebhookValidator.verifyQuickBooks(
            rawBody.toString(),
            signature,
            secret,
          );
          break;

        case WEBHOOK_VERIFIERS.GENERIC:
        default:
          isValid = WebhookValidator.verify({
            payload: rawBody.toString(),
            signature,
            secret,
          });
          break;
      }

      if (!isValid) {
        logger.warn('Webhook signature verification failed', {
          provider: providerName,
        });

        logSecurityEvent('WEBHOOK_SIGNATURE_INVALID', {
          provider: providerName,
          ip: req.ip,
        });

        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Parse payload
      let payload;
      try {
        payload = JSON.parse(rawBody.toString());
      } catch (parseError) {
        logger.warn('Webhook payload parse error', {
          provider: providerName,
          error: parseError.message,
        });
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      // Idempotency check
      const eventId = extractEventId(providerName, payload);
      if (eventId && processedEvents.has(eventId)) {
        logger.info('Webhook event already processed (idempotent)', {
          provider: providerName,
          eventId,
        });
        // Return 200 to acknowledge (don't retry)
        return res.status(200).json({ received: true, duplicate: true });
      }

      // Mark as processed
      if (eventId) {
        processedEvents.add(eventId);

        // Clean up old events (keep last 10000)
        if (processedEvents.size > 10000) {
          const iterator = processedEvents.values();
          for (let i = 0; i < 1000; i++) {
            processedEvents.delete(iterator.next().value);
          }
        }
      }

      // Queue event for processing (Phase 3 will process these)
      queueEvent(providerName, payload, {
        eventId,
        signatureVerified: true,
        processingTime: Date.now() - startTime,
      });

      logger.info('Webhook received and queued', {
        provider: providerName,
        eventId,
        eventType: payload.type,
        processingTime: Date.now() - startTime,
      });

      // Acknowledge receipt immediately (best practice for webhooks)
      return res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Webhook processing error', {
        provider: providerName,
        error: error.message,
        stack: error.stack,
      });

      // Return 500 to trigger retry (if provider supports it)
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  return router;
}

/**
 * Create the main webhooks router with all provider sub-routers
 */
function createMainWebhooksRouter() {
  const router = express.Router();

  // Mount provider-specific webhook routers
  const webhookProviders = getWebhookProviders();

  for (const [providerName, _config] of Object.entries(webhookProviders)) {
    router.use(`/${providerName}`, createWebhookRouter(providerName));
  }

  // Health check for webhook endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      providers: Object.keys(webhookProviders),
      queueLength: eventQueue.length,
    });
  });

  return router;
}

// Generate main router
const mainRouter = createMainWebhooksRouter();

// Export factory + main router + queue accessors (for Phase 3)
module.exports = {
  createWebhookRouter,
  createMainWebhooksRouter,
  router: mainRouter,

  // Queue accessors for Phase 3 sync services
  getEventQueue: () => [...eventQueue],
  getQueueLength: () => eventQueue.length,
  dequeueEvent: () => eventQueue.shift(),
  clearQueue: () => { eventQueue.length = 0; }, // For testing

  // Idempotency accessors (for testing)
  _processedEvents: processedEvents,
};
