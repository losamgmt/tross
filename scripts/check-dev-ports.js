#!/usr/bin/env node
/**
 * Check Dev Ports - Wrapper that reads from centralized ports.js
 *
 * Usage:
 *   node scripts/check-dev-ports.js           # Check both ports
 *   node scripts/check-dev-ports.js --backend  # Check backend only
 *   node scripts/check-dev-ports.js --frontend # Check frontend only
 *
 * Checks BACKEND_PORT and FRONTEND_PORT availability.
 */

const { spawn } = require("child_process");
const path = require("path");
const ports = require("../config/ports");

const args = process.argv.slice(2);
let portsToCheck = [];

if (args.includes("--backend")) {
  portsToCheck.push(ports.BACKEND_PORT);
}
if (args.includes("--frontend")) {
  portsToCheck.push(ports.FRONTEND_PORT);
}
if (portsToCheck.length === 0) {
  // Default: check both dev ports
  portsToCheck = [ports.BACKEND_PORT, ports.FRONTEND_PORT];
}

const child = spawn(
  "node",
  [path.join(__dirname, "check-ports.js"), ...portsToCheck.map(String)],
  {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  },
);

child.on("close", (code) => {
  process.exit(code);
});
