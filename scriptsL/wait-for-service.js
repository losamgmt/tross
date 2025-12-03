#!/usr/bin/env node
/**
 * Wait for a service to be ready by checking its health endpoint
 * Usage: node scripts/wait-for-service.js <url> [max-attempts] [delay-ms]
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

/**
 * Check if a URL is responding
 * @param {string} urlString - URL to check
 * @returns {Promise<boolean>} - True if responding
 */
async function checkUrl(urlString) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlString);
      const client = url.protocol === "https:" ? https : http;

      const req = client.get(url, { timeout: 2000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });

      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Wait for service to be ready
 * @param {string} url - URL to check
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} delayMs - Delay between attempts in ms
 * @returns {Promise<boolean>} - True if service is ready
 */
async function waitForService(url, maxAttempts = 30, delayMs = 1000) {
  console.log(`⏳ Waiting for service at ${url}...`);
  console.log(`   Max attempts: ${maxAttempts}, Delay: ${delayMs}ms\n`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    process.stdout.write(`   Attempt ${attempt}/${maxAttempts}... `);

    const isReady = await checkUrl(url);

    if (isReady) {
      console.log("✅ SUCCESS\n");
      console.log(`✅ Service is ready at ${url}`);
      return true;
    }

    console.log("❌ Not ready");

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log(
    `\n❌ Service did not become ready after ${maxAttempts} attempts`,
  );
  return false;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("❌ No URL specified");
    console.log(
      "Usage: node scripts/wait-for-service.js <url> [max-attempts] [delay-ms]",
    );
    console.log(
      "Example: node scripts/wait-for-service.js http://localhost:3001/api/health 30 1000",
    );
    process.exit(1);
  }

  const url = args[0];
  const maxAttempts = parseInt(args[1], 10) || 30;
  const delayMs = parseInt(args[2], 10) || 1000;

  const success = await waitForService(url, maxAttempts, delayMs);

  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
}

module.exports = { waitForService, checkUrl };
