#!/usr/bin/env node
/**
 * Health Check - Wrapper that reads from centralized ports.js
 *
 * Usage: node scripts/health-check.js
 *
 * Checks backend health endpoint and port availability.
 */

const { execSync } = require("child_process");
const ports = require("../config/ports");

console.log(`🩺 Tross Health Check`);
console.log(`========================\n`);

// Check backend health endpoint
console.log(`📡 Checking backend at ${ports.BACKEND_HEALTH_URL}...`);
try {
  execSync(`curl -f ${ports.BACKEND_HEALTH_URL}`, { stdio: "inherit" });
  console.log(`\n✅ Backend is healthy!\n`);
} catch (error) {
  console.log(`\n❌ Backend is not responding\n`);
}

// Check port availability
console.log(`🔍 Checking port status...`);
const portsToCheck = [
  ports.BACKEND_PORT,
  ports.FRONTEND_PORT,
  ports.DB_DEV_PORT,
  ports.DB_TEST_PORT,
];

try {
  execSync(`node scripts/check-ports.js ${portsToCheck.join(" ")}`, {
    stdio: "inherit",
  });
} catch (error) {
  // check-ports handles its own output
}
