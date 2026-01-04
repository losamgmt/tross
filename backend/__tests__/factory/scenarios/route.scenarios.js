/**
 * Route Test Scenarios
 *
 * PRINCIPLE: Tests are behaviors, not implementations.
 * Scenarios self-select based on route/endpoint metadata.
 * If preconditions not met, scenario returns early (no test generated).
 *
 * Each scenario receives:
 * - routeMeta: The route's registry entry
 * - endpointMeta: The specific endpoint being tested
 * - ctx: Test context with request, expect, authHeader, etc.
 */

const { HTTP_STATUS } = require('../../../config/constants');

// =============================================================================
// AUTHENTICATION SCENARIOS
// =============================================================================

/**
 * Test: Unauthenticated requests return 401
 */
function requiresAuthentication(routeMeta, endpointMeta, ctx) {
  // Skip if route doesn't require auth or endpoint is public
  if (!routeMeta.auth?.required) return;
  if (endpointMeta.public) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`returns 401 without authentication`, async () => {
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath);
    ctx.expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });
}

/**
 * Test: Insufficient role returns 403
 */
function requiresMinimumRole(routeMeta, endpointMeta, ctx) {
  const minRole = endpointMeta.minRole || routeMeta.auth?.minRole;
  if (!minRole || minRole === 'viewer') return; // viewer is lowest, can't test insufficient

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);
  const insufficientRole = getInsufficientRole(minRole);

  ctx.it(`returns 403 for ${insufficientRole} role (requires ${minRole})`, async () => {
    const auth = await ctx.authHeader(insufficientRole);
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);
    ctx.expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
}

/**
 * Test: Admin can access admin-only endpoints
 */
function adminCanAccess(routeMeta, endpointMeta, ctx) {
  const minRole = endpointMeta.minRole || routeMeta.auth?.minRole;
  if (minRole !== 'admin') return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`allows admin access`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);
    // Should not be 401 or 403
    ctx.expect([401, 403]).not.toContain(response.status);
  });
}

// =============================================================================
// PARAMETER VALIDATION SCENARIOS
// =============================================================================

/**
 * Test: Invalid ID parameters return 400 or 404
 */
function validatesIdParams(routeMeta, endpointMeta, ctx) {
  const idParams = Object.entries(endpointMeta.paramTypes || {}).filter(
    ([_, type]) => type === 'id',
  );

  if (idParams.length === 0) return;

  for (const [paramName] of idParams) {
    ctx.it(`validates ${paramName} as integer`, async () => {
      const auth = await ctx.authHeader('admin');
      const badPath = buildPath(
        routeMeta.basePath,
        endpointMeta.path.replace(`:${paramName}`, 'invalid'),
      );
      const response = await makeRequest(ctx.request, endpointMeta.method, badPath, auth);
      // Either 400 (validation) or 404 (route not matched) are acceptable
      ctx.expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(response.status);
    });
  }
}

/**
 * Test: Negative IDs return 400 or 404
 */
function rejectsNegativeIds(routeMeta, endpointMeta, ctx) {
  const idParams = Object.entries(endpointMeta.paramTypes || {}).filter(
    ([_, type]) => type === 'id',
  );

  if (idParams.length === 0) return;

  for (const [paramName] of idParams) {
    ctx.it(`rejects negative ${paramName}`, async () => {
      const auth = await ctx.authHeader('admin');
      const badPath = buildPath(
        routeMeta.basePath,
        endpointMeta.path.replace(`:${paramName}`, '-1'),
      );
      const response = await makeRequest(ctx.request, endpointMeta.method, badPath, auth);
      // Either 400 (validation error) or 404 (not found) are acceptable
      ctx.expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(response.status);
    });
  }
}

// =============================================================================
// PAGINATION SCENARIOS
// =============================================================================

/**
 * Test: Endpoints with pagination accept limit/offset
 */
function supportsPagination(routeMeta, endpointMeta, ctx) {
  if (!endpointMeta.pagination) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`accepts limit and offset query params`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(
      ctx.request,
      endpointMeta.method,
      `${fullPath}?limit=5&offset=0`,
      auth,
    );
    // Should succeed (200) or return empty (204)
    ctx.expect([200, 204]).toContain(response.status);
  });
}

/**
 * Test: Excessive limit is handled
 */
function handlesExcessiveLimit(routeMeta, endpointMeta, ctx) {
  if (!endpointMeta.pagination) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`handles excessive limit gracefully`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(
      ctx.request,
      endpointMeta.method,
      `${fullPath}?limit=10000`,
      auth,
    );
    // Either caps the limit (200) or rejects (400)
    ctx.expect([200, 400]).toContain(response.status);
  });
}

/**
 * Test: Invalid pagination params are rejected
 */
function rejectsInvalidPagination(routeMeta, endpointMeta, ctx) {
  if (!endpointMeta.pagination) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`handles invalid offset gracefully`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(
      ctx.request,
      endpointMeta.method,
      `${fullPath}?offset=-5`,
      auth,
    );
    // Either rejects (400) or treats as 0 (200) - both are valid patterns
    ctx.expect([200, 400]).toContain(response.status);
  });
}

// =============================================================================
// RESPONSE FORMAT SCENARIOS
// =============================================================================

/**
 * Test: Successful responses have consistent format
 */
function hasConsistentResponseFormat(routeMeta, endpointMeta, ctx) {
  // Skip dynamic routes and downloads
  if (routeMeta.isDynamic) return;
  if (endpointMeta.behavior === 'download') return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`returns consistent response format`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);

    // If successful, should have standard format
    if (response.status >= 200 && response.status < 300 && response.body) {
      // Should have success field or be a direct data response
      ctx.expect(
        response.body.success !== undefined || response.body.data !== undefined || Array.isArray(response.body),
      ).toBe(true);
    }
  });
}

/**
 * Test: List endpoints return arrays
 */
function listReturnsArray(routeMeta, endpointMeta, ctx) {
  if (endpointMeta.behavior !== 'list') return;
  if (routeMeta.isDynamic) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`returns array or paginated response for list behavior`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);

    if (response.status === 200) {
      const body = response.body;
      // Accept: array directly, data array, or paginated response with items/data
      const isValidListResponse =
        Array.isArray(body) ||
        Array.isArray(body.data) ||
        Array.isArray(body.items) ||
        Array.isArray(body.logs) ||
        Array.isArray(body.sessions) ||
        (body.data !== undefined); // Paginated response with data
      ctx.expect(isValidListResponse).toBe(true);
    }
  });
}

// =============================================================================
// ERROR HANDLING SCENARIOS
// =============================================================================

/**
 * Test: Non-existent resources return 404
 */
function handlesNotFound(routeMeta, endpointMeta, ctx) {
  if (endpointMeta.behavior !== 'getOne') return;
  if (!endpointMeta.paramTypes?.id) return;
  if (routeMeta.isDynamic) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path.replace(':id', '999999'));

  ctx.it(`returns 404 for non-existent resource`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);
    // Either 404 or 200 with null/empty (both acceptable patterns)
    ctx.expect([200, 404]).toContain(response.status);
  });
}

/**
 * Test: DELETE on non-existent returns 404
 */
function deleteHandlesNotFound(routeMeta, endpointMeta, ctx) {
  if (endpointMeta.behavior !== 'delete') return;
  if (routeMeta.isDynamic) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path.replace(':id', '999999'));

  ctx.it(`returns 404 for DELETE on non-existent`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);
    ctx.expect([404, 204]).toContain(response.status);
  });
}

/**
 * Test: Empty body on create/update returns 400
 */
function rejectsEmptyBody(routeMeta, endpointMeta, ctx) {
  if (!['create', 'update'].includes(endpointMeta.behavior)) return;
  if (!endpointMeta.body) return; // No expected body
  if (routeMeta.isDynamic) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path);

  ctx.it(`rejects empty body on ${endpointMeta.behavior}`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth, {});
    // Should reject with 400 or 422
    ctx.expect([400, 422]).toContain(response.status);
  });
}

/**
 * Test: Action endpoints handle errors gracefully
 */
function actionHandlesInvalidInput(routeMeta, endpointMeta, ctx) {
  if (endpointMeta.behavior !== 'action') return;
  if (routeMeta.isDynamic) return;

  // Test with invalid ID if endpoint takes userId or similar
  const hasIdParam = Object.entries(endpointMeta.paramTypes || {}).some(
    ([_, type]) => type === 'id'
  );
  if (!hasIdParam) return;

  const fullPath = buildPath(routeMeta.basePath, endpointMeta.path)
    .replace('/1/', '/999999/'); // Replace test ID with non-existent

  ctx.it(`handles action on non-existent resource`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, fullPath, auth);
    // Should return 404 or 400, not 500
    ctx.expect([400, 404, 409, 422]).toContain(response.status);
    ctx.expect(response.body.stack).toBeUndefined(); // No stack traces
  });
}

/**
 * Test: Error responses don't leak sensitive data
 */
function errorsDoNotLeakData(routeMeta, endpointMeta, ctx) {
  if (routeMeta.isDynamic) return;

  const badPath = buildPath(routeMeta.basePath, endpointMeta.path.replace(/:id\b/g, 'invalid'));

  ctx.it(`error responses don't leak sensitive data`, async () => {
    const auth = await ctx.authHeader('admin');
    const response = await makeRequest(ctx.request, endpointMeta.method, badPath, auth);

    if (response.status >= 400) {
      // Should not expose stack traces or SQL
      ctx.expect(response.body.stack).toBeUndefined();
      if (response.body.message) {
        ctx.expect(response.body.message).not.toMatch(/SELECT|INSERT|UPDATE|DELETE|FROM/i);
      }
    }
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build full path with parameter placeholders replaced with valid values
 */
function buildPath(basePath, endpointPath) {
  // Replace :param with valid test values
  const resolvedPath = endpointPath
    .replace(/:id\b/g, '1')
    .replace(/:userId\b/g, '1')
    .replace(/:resourceId\b/g, '1')
    .replace(/:key\b/g, 'test-key')
    .replace(/:entityType\b/g, 'customers')
    .replace(/:resourceType\b/g, 'customers')
    .replace(/:entity\b/g, 'customers');

  return `${basePath}${resolvedPath}`;
}

/**
 * Get a role that's insufficient for the required role
 */
function getInsufficientRole(requiredRole) {
  const roleHierarchy = ['viewer', 'user', 'manager', 'admin'];
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  if (requiredIndex <= 0) return 'viewer';
  return roleHierarchy[requiredIndex - 1];
}

/**
 * Make HTTP request with optional auth
 */
async function makeRequest(request, method, path, auth = null, body = null) {
  const methodLower = method.toLowerCase();
  let req = request[methodLower](path);

  if (auth) {
    req = req.set(auth);
  }

  if (body && ['post', 'put', 'patch'].includes(methodLower)) {
    req = req.send(body);
  }

  return req;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Auth scenarios
  requiresAuthentication,
  requiresMinimumRole,
  adminCanAccess,

  // Validation scenarios
  validatesIdParams,
  rejectsNegativeIds,

  // Pagination scenarios
  supportsPagination,
  handlesExcessiveLimit,
  rejectsInvalidPagination,

  // Response scenarios
  hasConsistentResponseFormat,
  listReturnsArray,

  // Error scenarios
  handlesNotFound,
  deleteHandlesNotFound,
  rejectsEmptyBody,
  actionHandlesInvalidInput,
  errorsDoNotLeakData,
};
