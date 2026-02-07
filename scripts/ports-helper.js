#!/usr/bin/env node
/**
 * Port Helper - Centralized port access for scripts
 *
 * Reads from config/ports.js and outputs ports for shell scripts.
 * Single source of truth for all port configurations.
 *
 * Usage:
 *   node scripts/ports-helper.js backend    -> outputs BACKEND_PORT
 *   node scripts/ports-helper.js frontend   -> outputs FRONTEND_PORT
 *   node scripts/ports-helper.js all        -> outputs "BACKEND_PORT FRONTEND_PORT"
 *   node scripts/ports-helper.js dev        -> outputs "BACKEND_PORT FRONTEND_PORT" (aliases to all)
 *   node scripts/ports-helper.js health     -> outputs all ports for health check
 */

const ports = require("../config/ports");

const arg = process.argv[2];

switch (arg) {
  case "backend":
    console.log(ports.BACKEND_PORT);
    break;
  case "frontend":
    console.log(ports.FRONTEND_PORT);
    break;
  case "all":
  case "dev":
    console.log(`${ports.BACKEND_PORT} ${ports.FRONTEND_PORT}`);
    break;
  case "health":
    console.log(
      `${ports.BACKEND_PORT} ${ports.FRONTEND_PORT} ${ports.DB_DEV_PORT} ${ports.DB_TEST_PORT}`,
    );
    break;
  case "db":
    console.log(`${ports.DB_DEV_PORT} ${ports.DB_TEST_PORT}`);
    break;
  case "url:backend":
    console.log(ports.BACKEND_URL);
    break;
  case "url:health":
    console.log(ports.BACKEND_HEALTH_URL);
    break;
  default:
    console.error(
      "Usage: node scripts/ports-helper.js [backend|frontend|all|dev|health|db|url:backend|url:health]",
    );
    process.exit(1);
}
