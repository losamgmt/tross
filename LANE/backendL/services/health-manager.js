/**
 * Service Health & Error Management System
 * KISS principle: Each service stands alone, degrades gracefully
 */

const { logger } = require('../config/logger');
const { ENVIRONMENTS: _ENVIRONMENTS } = require('../config/constants');

class HealthManager {
  constructor() {
    this.services = new Map();
    this.startTime = Date.now();
    this.serviceChecks = {
      database: null,
      external_apis: null,
      file_system: null,
    };
  }

  /**
   * Register a service with health check function
   */
  registerService(name, healthCheckFn, required = false) {
    this.services.set(name, {
      name,
      healthCheck: healthCheckFn,
      required,
      status: 'unknown',
      lastCheck: null,
      lastError: null,
    });
  }

  /**
   * Check health of a specific service
   */
  async checkService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return { status: 'unknown', error: 'Service not registered' };
    }

    try {
      const result = await Promise.race([
        service.healthCheck(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000),
        ),
      ]);

      service.status = 'healthy';
      service.lastCheck = new Date().toISOString();
      service.lastError = null;

      return { status: 'healthy', ...result };
    } catch (error) {
      service.status = 'unhealthy';
      service.lastCheck = new Date().toISOString();
      service.lastError = error.message;

      logger.warn(`Service health check failed: ${serviceName}`, {
        service: serviceName,
        error: error.message,
        required: service.required,
      });

      return {
        status: 'unhealthy',
        error: error.message,
        required: service.required,
      };
    }
  }

  /**
   * Check health of all services
   */
  async checkAllServices() {
    const results = {};
    const promises = Array.from(this.services.keys()).map(
      async (serviceName) => {
        results[serviceName] = await this.checkService(serviceName);
      },
    );

    await Promise.all(promises);
    return results;
  }

  /**
   * Get overall system health (with graceful degradation)
   */
  async getSystemHealth() {
    const serviceResults = await this.checkAllServices();

    // Determine overall status
    const requiredServices = Array.from(this.services.values()).filter(
      (s) => s.required,
    );
    const requiredHealthy = requiredServices.every(
      (s) => s.status === 'healthy',
    );

    const _allHealthy = Array.from(this.services.values()).every(
      (s) => s.status === 'healthy',
    );
    const hasUnhealthy = Array.from(this.services.values()).some(
      (s) => s.status === 'unhealthy',
    );

    let overallStatus = 'healthy';
    if (!requiredHealthy) {
      overallStatus = 'critical'; // Required services down
    } else if (hasUnhealthy) {
      overallStatus = 'degraded'; // Optional services down
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: serviceResults,
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
          100,
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100,
      },
      isolation: {
        database_required: false, // Backend can work without DB
        external_apis_required: false, // Backend can work without external APIs
        graceful_degradation: true,
      },
    };
  }

  /**
   * Create service-specific health endpoints
   */
  async getServiceStatus(serviceName) {
    if (!this.services.has(serviceName)) {
      return {
        status: 'unknown',
        error: `Service '${serviceName}' not found`,
        available_services: Array.from(this.services.keys()),
      };
    }

    const result = await this.checkService(serviceName);
    return {
      service: serviceName,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Default health check implementations
 */
const defaultHealthChecks = {
  database: async () => {
    // This should NOT crash the server if DB is down
    try {
      const db = require('../db/connection');
      await db.query('SELECT 1');
      return { database: 'connected', type: 'PostgreSQL' };
    } catch (error) {
      // Database down is OK - we can work without it
      return {
        database: 'disconnected',
        error: error.message,
        mode: 'standalone',
      };
    }
  },

  filesystem: async () => {
    const fs = require('fs').promises;
    try {
      await fs.access('logs');
      return { filesystem: 'accessible' };
    } catch (error) {
      return { filesystem: 'limited', error: error.message };
    }
  },

  memory: async () => {
    const usage = process.memoryUsage();
    const used = usage.heapUsed / 1024 / 1024; // MB

    if (used > 500) {
      // 500MB threshold
      throw new Error(`High memory usage: ${Math.round(used)}MB`);
    }

    return { memory: `${Math.round(used)}MB`, status: 'normal' };
  },
};

// Create singleton instance
const healthManager = new HealthManager();

// Register default services (none are required for basic operation)
healthManager.registerService('database', defaultHealthChecks.database, false);
healthManager.registerService(
  'filesystem',
  defaultHealthChecks.filesystem,
  false,
);
healthManager.registerService('memory', defaultHealthChecks.memory, false);

module.exports = {
  healthManager,
  defaultHealthChecks,
};
