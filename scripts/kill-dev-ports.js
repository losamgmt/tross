#!/usr/bin/env node
/**
 * Kill Dev Ports - Wrapper that reads from centralized ports.js
 *
 * Usage: node scripts/kill-dev-ports.js [--backend] [--frontend] [--all]
 *
 * Kills processes on BACKEND_PORT and/or FRONTEND_PORT.
 * Default (no args): kills both
 */

const { spawn } = require("child_process");
const path = require("path");
const ports = require("../config/ports");

const args = process.argv.slice(2);
let portsToKill = [];

if (args.includes("--backend")) {
  portsToKill.push(ports.BACKEND_PORT);
}
if (args.includes("--frontend")) {
  portsToKill.push(ports.FRONTEND_PORT);
}
if (
  args.includes("--all") ||
  args.includes("--health") ||
  portsToKill.length === 0
) {
  // Default: kill both dev ports
  portsToKill = [ports.BACKEND_PORT, ports.FRONTEND_PORT];
}

const child = spawn(
  "node",
  [path.join(__dirname, "kill-port.js"), ...portsToKill.map(String)],
  {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  },
);

child.on("close", (code) => {
  process.exit(code);
});
