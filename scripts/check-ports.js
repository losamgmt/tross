#!/usr/bin/env node
/**
 * Check if ports are available before starting services
 * Provides helpful error messages if ports are in use
 * Usage: node scripts/check-ports.js 3001 8080
 */

const { execSync } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';

/**
 * Check if a port is in use (Windows)
 * @param {number} port - Port number
 * @returns {Object} - { inUse: boolean, pid: string|null, process: string|null }
 */
function checkPortWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        // Get process name
        let processName = 'Unknown';
        try {
          const taskOutput = execSync(
            `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
          );
          const taskParts = taskOutput.split(',');
          processName = taskParts[0]?.replace(/"/g, '') || 'Unknown';
        } catch {
          // Process might have exited
        }

        return { inUse: true, pid, process: processName };
      }
    }
    return { inUse: false, pid: null, process: null };
  } catch {
    return { inUse: false, pid: null, process: null };
  }
}

/**
 * Check if a port is in use (Unix/Linux/Mac)
 * @param {number} port - Port number
 * @returns {Object} - { inUse: boolean, pid: string|null, process: string|null }
 */
function checkPortUnix(port) {
  try {
    const output = execSync(`lsof -ti:${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const pid = output.trim().split('\n')[0];

    if (!pid) {
      return { inUse: false, pid: null, process: null };
    }

    // Get process name
    let processName = 'Unknown';
    try {
      const psOutput = execSync(`ps -p ${pid} -o comm=`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      processName = psOutput.trim();
    } catch {
      // Process might have exited
    }

    return { inUse: true, pid, process: processName };
  } catch {
    return { inUse: false, pid: null, process: null };
  }
}

/**
 * Check multiple ports
 * @param {number[]} ports - Array of port numbers
 * @returns {Object} - Map of port to status
 */
function checkPorts(ports) {
  const checkPort = isWindows ? checkPortWindows : checkPortUnix;
  const results = {};

  for (const port of ports) {
    results[port] = checkPort(port);
  }

  return results;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('❌ No ports specified');
    console.log(
      'Usage: node scripts/check-ports.js <port1> [port2] [port3] ...',
    );
    console.log('Example: node scripts/check-ports.js 3001 8080');
    process.exit(1);
  }

  console.log(`🔍 Checking ports on ${os.platform()}...\n`);

  const ports = args.map((p) => parseInt(p, 10)).filter((p) => !isNaN(p));
  const results = checkPorts(ports);

  let hasConflicts = false;
  let allFree = true;

  for (const [port, status] of Object.entries(results)) {
    if (status.inUse) {
      console.log(`❌ Port ${port} is IN USE`);
      console.log(`   Process: ${status.process} (PID: ${status.pid})`);
      console.log(`   To free: node scripts/kill-port.js ${port}\n`);
      hasConflicts = true;
      allFree = false;
    } else {
      console.log(`✅ Port ${port} is available\n`);
    }
  }

  if (allFree) {
    console.log('✅ All ports are available');
    process.exit(0);
  } else if (hasConflicts) {
    console.log('\n⚠️  Port conflicts detected!');
    console.log('Run this to free all ports:');
    console.log(`   node scripts/kill-port.js ${ports.join(' ')}\n`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkPorts, checkPortWindows, checkPortUnix };
