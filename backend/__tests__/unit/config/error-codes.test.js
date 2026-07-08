/**
 * ERROR_CODES usage guard.
 *
 * Enforces that application error codes come from the single ERROR_CODES SSOT
 * (config/error-codes.js):
 *   - ERROR_CODES is frozen and every value equals its key
 *   - every `ERROR_CODES.<KEY>` reference in backend source resolves to a real key
 *     (catches typos like ERROR_CODES.VALIDATON_FAILED -> undefined)
 *   - the retired ad-hoc codes never reappear as quoted string literals
 */
const fs = require("fs");
const path = require("path");
const { ERROR_CODES } = require("../../../config/error-codes");

const BACKEND = path.join(__dirname, "..", "..", "..");
const SKIP = new Set([
  "node_modules",
  "__tests__",
  "generated",
  "logs",
  "coverage",
  ".git",
]);

function collectJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) collectJsFiles(path.join(dir, entry.name), acc);
    } else if (entry.name.endsWith(".js")) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

const backendFiles = collectJsFiles(BACKEND);

describe("ERROR_CODES SSOT usage guard", () => {
  it("is frozen and every value equals its key", () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
    for (const [key, value] of Object.entries(ERROR_CODES)) {
      expect(value).toBe(key);
    }
  });

  it("every ERROR_CODES.<KEY> reference in backend source is a defined key", () => {
    const validKeys = new Set(Object.keys(ERROR_CODES));
    const offenders = [];
    // \b avoids matching PG_ERROR_CODES.* (the separate Postgres SQLSTATE map).
    const referenceRe = /\bERROR_CODES\.([A-Za-z_]\w*)/g;

    for (const file of backendFiles) {
      const src = fs.readFileSync(file, "utf8");
      let match;
      while ((match = referenceRe.exec(src)) !== null) {
        const key = match[1];
        if (key === "X") continue; // documentation placeholder
        if (!validKeys.has(key)) {
          offenders.push(`${path.relative(BACKEND, file)}: ERROR_CODES.${key}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("retired ad-hoc codes do not reappear as quoted string literals", () => {
    const retired = [
      "BAD_REQUEST",
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "CONFLICT",
      "FORBIDDEN",
      "UNAUTHORIZED",
      "INTERNAL_ERROR",
      "SERVICE_UNAVAILABLE",
    ];
    const offenders = [];

    for (const file of backendFiles) {
      const src = fs.readFileSync(file, "utf8");
      for (const code of retired) {
        if (new RegExp(`['"]${code}['"]`).test(src)) {
          offenders.push(`${path.relative(BACKEND, file)}: '${code}'`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
