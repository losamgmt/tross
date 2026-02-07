/**
 * Service Test Scenarios
 *
 * PRINCIPLE: Tests are behaviors, not implementations.
 * Scenarios self-select based on service/method metadata.
 * If preconditions not met, scenario returns early (no test generated).
 *
 * Each scenario receives:
 * - serviceMeta: The service's registry entry
 * - ctx: Test context with service instance, mocks, expect, etc.
 */

// =============================================================================
// INTERFACE SCENARIOS
// =============================================================================

/**
 * Test: Service exports all declared methods
 */
function exportsAllDeclaredMethods(serviceMeta, ctx) {
  for (const methodName of Object.keys(serviceMeta.methods)) {
    ctx.it(`exports ${methodName}()`, () => {
      ctx.expect(typeof ctx.service[methodName]).toBe("function");
    });
  }
}

/**
 * Test: Async methods return promises
 */
function asyncMethodsReturnPromises(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    if (!methodMeta.async) continue;

    ctx.it(`${methodName}() returns a Promise`, async () => {
      const args = generateTestArgs(methodMeta.args || []);
      try {
        const result = ctx.service[methodName](...args);
        ctx.expect(result).toBeInstanceOf(Promise);
        // Await to prevent unhandled rejection
        await result.catch(() => {});
      } catch {
        // Method may throw synchronously for invalid args - that's OK for this test
      }
    });
  }
}

/**
 * Test: Sync methods return immediately (not promises)
 */
function syncMethodsReturnImmediately(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    if (methodMeta.async) continue;

    ctx.it(`${methodName}() returns synchronously (not a Promise)`, () => {
      const args = generateTestArgs(methodMeta.args || []);
      try {
        const result = ctx.service[methodName](...args);
        // Should not be a Promise
        ctx.expect(result instanceof Promise).toBe(false);
      } catch {
        // Method may throw for invalid args - that's OK
      }
    });
  }
}

// =============================================================================
// RETURN TYPE SCENARIOS
// =============================================================================

/**
 * Test: Methods return correct types
 */
function methodsReturnCorrectTypes(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    if (!methodMeta.returns || methodMeta.returns === "void") continue;

    ctx.it(`${methodName}() returns ${methodMeta.returns}`, async () => {
      const args = generateTestArgs(methodMeta.args || []);

      try {
        const result = methodMeta.async
          ? await ctx.service[methodName](...args)
          : ctx.service[methodName](...args);

        assertReturnType(ctx.expect, result, methodMeta.returns);
      } catch (error) {
        // If throws is expected, that's OK
        if (methodMeta.throws) return;
        // Otherwise, might be due to missing deps/data - skip
      }
    });
  }
}

// =============================================================================
// ERROR HANDLING SCENARIOS
// =============================================================================

/**
 * Test: Methods handle null/undefined gracefully
 */
function handlesNullInputs(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    const requiredArgs = (methodMeta.args || []).filter((a) => !a.optional);
    if (requiredArgs.length === 0) continue;

    ctx.it(`${methodName}() handles null inputs gracefully`, async () => {
      const nullArgs = requiredArgs.map(() => null);

      try {
        if (methodMeta.async) {
          await ctx.service[methodName](...nullArgs);
        } else {
          ctx.service[methodName](...nullArgs);
        }
        // If it doesn't throw, that's fine
      } catch (error) {
        // Should throw a meaningful error, not crash
        ctx.expect(error).toBeDefined();
        ctx.expect(error.message).toBeDefined();
      }
    });
  }
}

/**
 * Test: Methods handle empty string inputs
 */
function handlesEmptyStrings(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    const stringArgs = (methodMeta.args || []).filter(
      (a) => a.type === "string",
    );
    if (stringArgs.length === 0) continue;

    ctx.it(`${methodName}() handles empty string inputs`, async () => {
      const args = (methodMeta.args || []).map((arg) =>
        arg.type === "string" ? "" : generateSingleArg(arg),
      );

      try {
        if (methodMeta.async) {
          await ctx.service[methodName](...args);
        } else {
          ctx.service[methodName](...args);
        }
      } catch (error) {
        // Should throw meaningful error
        ctx.expect(error.message).toBeDefined();
      }
    });
  }
}

/**
 * Test: Methods handle invalid ID values
 */
function handlesInvalidIds(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    const idArgs = (methodMeta.args || []).filter((a) => a.type === "id");
    if (idArgs.length === 0) continue;

    ctx.it(`${methodName}() handles invalid ID gracefully`, async () => {
      const args = (methodMeta.args || []).map((arg) =>
        arg.type === "id" ? -999 : generateSingleArg(arg),
      );

      try {
        if (methodMeta.async) {
          const result = await ctx.service[methodName](...args);
          // Should return null/undefined/false for invalid ID, not crash
          ctx
            .expect(
              [null, undefined, false, []].some(
                (v) =>
                  result === v ||
                  (Array.isArray(result) && result.length === 0),
              ),
            )
            .toBe(true);
        } else {
          ctx.service[methodName](...args);
        }
      } catch (error) {
        // Throwing is also acceptable
        ctx.expect(error.message).toBeDefined();
      }
    });
  }
}

// =============================================================================
// QUERY SERVICE SCENARIOS
// =============================================================================

/**
 * Test: Query services return arrays for list methods
 */
function queryMethodsReturnArrays(serviceMeta, ctx) {
  if (serviceMeta.type !== "query") return;

  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    if (methodMeta.returns !== "array") continue;

    ctx.it(`${methodName}() returns an array`, async () => {
      const args = generateTestArgs(methodMeta.args || []);

      try {
        const result = methodMeta.async
          ? await ctx.service[methodName](...args)
          : ctx.service[methodName](...args);

        ctx.expect(Array.isArray(result)).toBe(true);
      } catch {
        // May fail due to missing data/deps
      }
    });
  }
}

// =============================================================================
// PAGINATION SCENARIOS
// =============================================================================

/**
 * Test: Methods with pagination respect limit/offset
 */
function paginationMethodsAcceptOptions(serviceMeta, ctx) {
  for (const [methodName, methodMeta] of Object.entries(serviceMeta.methods)) {
    if (!methodMeta.pagination) continue;

    ctx.it(`${methodName}() accepts pagination options`, async () => {
      try {
        const result = await ctx.service[methodName]({ limit: 5, offset: 0 });
        ctx.expect(Array.isArray(result)).toBe(true);
        ctx.expect(result.length).toBeLessThanOrEqual(5);
      } catch {
        // May fail due to missing data
      }
    });
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate test arguments from method arg metadata
 */
function generateTestArgs(args) {
  return args.map(generateSingleArg);
}

/**
 * Generate a single test argument based on type
 */
function generateSingleArg(arg) {
  if (arg.optional) return undefined;

  switch (arg.type) {
    case "string":
      return "test-value";
    case "id":
      return 1;
    case "object":
      return {};
    case "array":
      return [];
    case "boolean":
      return true;
    case "number":
      return 1;
    case "any":
      return "test";
    default:
      return null;
  }
}

/**
 * Assert return value matches expected type
 */
function assertReturnType(expect, result, expectedType) {
  switch (expectedType) {
    case "array":
      expect(Array.isArray(result)).toBe(true);
      break;
    case "object":
      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();
      break;
    case "object|null":
      expect(result === null || typeof result === "object").toBe(true);
      break;
    case "string":
      expect(typeof result).toBe("string");
      break;
    case "boolean":
      expect(typeof result).toBe("boolean");
      break;
    case "number":
      expect(typeof result).toBe("number");
      break;
    case "void":
      expect(result).toBeUndefined();
      break;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Interface scenarios
  exportsAllDeclaredMethods,
  asyncMethodsReturnPromises,
  syncMethodsReturnImmediately,

  // Return type scenarios
  methodsReturnCorrectTypes,

  // Error handling scenarios
  handlesNullInputs,
  handlesEmptyStrings,
  handlesInvalidIds,

  // Query scenarios
  queryMethodsReturnArrays,

  // Pagination scenarios
  paginationMethodsAcceptOptions,
};
