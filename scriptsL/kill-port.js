#!/usr/bin/env node
/**
 * Cross-platform port killer utility
 * Finds and kills processes using specified ports
 * Usage: node scripts/kill-port.js 3001 8080
 */

const { execSync, spawn } = require("child_process");
const os = require("os");

const isWindows = os.platform() === "win32";

/**
 * Find process ID using a port (Windows)
 * @param {number} port - Port number
 * @returns {string|null} - Process ID or null
 */
function findProcessWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const lines = output.trim().split("\n");

    for (const line of lines) {
      // Look for LISTENING state
      if (line.includes("LISTENING")) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          return pid;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Find process ID using a port (Unix/Linux/Mac)
 * @param {number} port - Port number
 * @returns {string|null} - Process ID or null
 */
function findProcessUnix(port) {
  try {
    const output = execSync(`lsof -ti:${port}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const pid = output.trim().split("\n")[0];
    return pid || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get process details (Windows)
 * @param {string} pid - Process ID
 * @returns {string} - Process name and details
 */
function getProcessDetailsWindows(pid) {
  try {
    const output = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const parts = output.split(",");
    const processName = parts[0]?.replace(/"/g, "") || "Unknown";
    return processName;
  } catch (error) {
    return "Unknown";
  }
}

/**
 * Get process details (Unix)
 * @param {string} pid - Process ID
 * @returns {string} - Process name and details
 */
function getProcessDetailsUnix(pid) {
  try {
    const output = execSync(`ps -p ${pid} -o comm=`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return output.trim() || "Unknown";
  } catch (error) {
    return "Unknown";
  }
}

/**
 * Kill a process by PID (Windows)
 * @param {string} pid - Process ID
 * @returns {boolean} - Success status
 */
function killProcessWindows(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: ["pipe", "pipe", "ignore"] });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Kill a process by PID (Unix)
 * @param {string} pid - Process ID
 * @returns {boolean} - Success status
 */
function killProcessUnix(pid) {
  try {
    execSync(`kill -9 ${pid}`, { stdio: ["pipe", "pipe", "ignore"] });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Kill process on a specific port
 * @param {number} port - Port number
 * @returns {Promise<boolean>} - Success status
 */
async function killPort(port) {
  console.log(`🔍 Checking port ${port}...`);

  const findProcess = isWindows ? findProcessWindows : findProcessUnix;
  const getDetails = isWindows
    ? getProcessDetailsWindows
    : getProcessDetailsUnix;
  const killProcess = isWindows ? killProcessWindows : killProcessUnix;

  const pid = findProcess(port);

  if (!pid) {
    console.log(`✅ Port ${port} is free`);
    return true;
  }

  const processName = getDetails(pid);
  console.log(
    `⚠️  Found process on port ${port}: ${processName} (PID: ${pid})`,
  );

  const killed = killProcess(pid);

  if (killed) {
    console.log(`✅ Successfully killed process ${pid} on port ${port}`);
    return true;
  } else {
    console.log(`❌ Failed to kill process ${pid} on port ${port}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("❌ No ports specified");
    console.log("Usage: node scripts/kill-port.js <port1> [port2] [port3] ...");
    console.log("Example: node scripts/kill-port.js 3001 8080");
    process.exit(1);
  }

  console.log(`🚀 Port Cleanup Utility (${os.platform()})\n`);

  let allSuccess = true;
  for (const port of args) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum)) {
      console.log(`⚠️  Skipping invalid port: ${port}`);
      continue;
    }

    const success = await killPort(portNum);
    if (!success) {
      allSuccess = false;
    }
    console.log(""); // Blank line between ports
  }

  if (allSuccess) {
    console.log("✅ All ports cleaned successfully");
    process.exit(0);
  } else {
    console.log("⚠️  Some ports could not be cleaned");
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}

module.exports = { killPort, isWindows };
