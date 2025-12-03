# Timeout Architecture

## Overview

TrossApp Backend implements a **multi-layer timeout strategy** that provides robust request handling, prevents resource exhaustion, and ensures fast failure for hung requests. This document describes the complete timeout architecture, configuration, and best practices.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Server Timeout (120s)                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Layer 2: Request Middleware Timeout (30s)        │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  Layer 3: Database Query Timeout (20s)      │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │  Layer 4: Service Timeouts (5-60s)    │  │  │  │
│  │  │  │  - Health Checks: 5s                  │  │  │  │
│  │  │  │  - External APIs: 10s                 │  │  │  │
│  │  │  │  - File Processing: 60s               │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Timeout Hierarchy

### Layer 1: Server Timeouts (Outermost)

**Purpose:** Protect Node.js HTTP server from hung connections and resource exhaustion.

**Configuration:**
```javascript
server.setTimeout(120000);           // 2 minutes
server.keepAliveTimeout = 125000;    // 2m 5s
server.headersTimeout = 130000;      // 2m 10s
```

**Behavior:**
- Forcefully closes socket connections exceeding 2 minutes
- Keep-alive must be > request timeout to prevent premature closure
- Headers timeout must be > keep-alive timeout
- Last line of defense against hung requests

**Location:** `backend/server.js` (line ~285)

---

### Layer 2: Request Middleware Timeout

**Purpose:** Provide graceful error responses before server timeout, track request duration, detect slow requests.

**Configuration:**
```javascript
// Default: 30 seconds
app.use(requestTimeout(TIMEOUTS.REQUEST.DEFAULT_MS));

// Quick operations: 5 seconds
router.get('/health', quickTimeout(), handler);

// Long operations: 90 seconds
router.get('/export', longTimeout(), handler);

// Custom timeout: specific milliseconds
router.get('/custom', requestTimeout(45000), handler);
```

**Behavior:**
- Tracks `req.startTime` for duration measurement
- Sets `req.timedout = true` when timeout occurs
- Sends HTTP 408 response with timeout details
- Logs slow requests (>3s warning, >10s error)
- Cleans up timers on response completion

**Error Response:**
```json
{
  "error": "Request Timeout",
  "message": "Request exceeded 30 second timeout",
  "timeout": 30000,
  "duration": 30015,
  "timestamp": "2025-11-10T12:00:00.000Z",
  "path": "/api/users"
}
```

**Location:** `backend/middleware/timeout.js`

---

### Layer 3: Database Query Timeout

**Purpose:** Prevent long-running queries from blocking connection pool, ensure database responsiveness.

**Configuration:**
```javascript
// Production/Development
const pool = new Pool({
  statement_timeout: 20000,        // 20 seconds
  query_timeout: 20000,            // 20 seconds
  connectionTimeoutMillis: 5000,   // 5 seconds
  idleTimeoutMillis: 30000,        // 30 seconds
});

// Test Environment (faster)
const testPool = new Pool({
  statement_timeout: 10000,        // 10 seconds
  query_timeout: 10000,            // 10 seconds
  connectionTimeoutMillis: 3000,   // 3 seconds
  idleTimeoutMillis: 1000,         // 1 second
});
```

**Behavior:**
- `statement_timeout`: PostgreSQL terminates queries exceeding this time
- `query_timeout`: pg driver timeout (client-side)
- `connectionTimeoutMillis`: Time to establish connection
- `idleTimeoutMillis`: Time before idle connection is closed
- Throws error on timeout, caught by route error handlers

**Error Handling:**
```javascript
try {
  await db.query('SELECT * FROM users WHERE ...');
} catch (error) {
  if (error.message.includes('timeout') || error.message.includes('canceling statement')) {
    // Database timeout occurred
    logger.error('Database query timeout', { error: error.message });
    res.status(500).json({ error: 'Database operation timed out' });
  }
}
```

**Location:** `backend/db/connection.js`

---

### Layer 4: Service Timeouts (Innermost)

**Purpose:** Fast failure for specific service operations.

**Configuration:**
```javascript
SERVICES: {
  HEALTH_CHECK_MS: 5000,        // Health checks must be fast
  EXTERNAL_API_MS: 10000,       // Auth0, payment gateways
  FILE_PROCESSING_MS: 60000,    // File uploads, processing
  EMAIL_DELIVERY_MS: 15000,     // Email sending
}
```

**Usage:**
```javascript
// Health check with timeout
const healthCheck = await Promise.race([
  checkDatabaseHealth(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Health check timeout')), 5000)
  )
]);
```

**Location:** `backend/config/timeouts.js`, used in `backend/services/*`

---

## Monitoring & Alerting

### Slow Request Detection

**Thresholds:**
```javascript
MONITORING: {
  SLOW_REQUEST_MS: 3000,        // Log warning
  VERY_SLOW_REQUEST_MS: 10000,  // Log error
  SLOW_QUERY_MS: 1000,          // Database slow query
}
```

**Logging:**
```javascript
// Slow request (3-10 seconds)
logger.warn('Slow request detected', {
  method: 'GET',
  path: '/api/users',
  duration: 5234,
  threshold: 3000,
  userId: 42
});

// Very slow request (>10 seconds)
logger.error('Very slow request detected', {
  method: 'POST',
  path: '/api/export',
  duration: 12450,
  threshold: 10000,
  userId: 42
});
```

### Timeout Tracking

All timeouts are logged with full context:

```javascript
logger.warn('Request timeout', {
  method: 'GET',
  path: '/api/users',
  url: '/api/users?page=1&limit=50',
  timeoutMs: 30000,
  duration: 30012,
  ip: '127.0.0.1',
  userAgent: 'curl/7.64.1',
  userId: 42
});
```

---

## Configuration

### Timeout Constants

All timeout values are centralized in `backend/config/timeouts.js`:

```javascript
const { TIMEOUTS, getTimeoutConfig, validateTimeoutHierarchy } = require('./config/timeouts');

// Access timeout values
console.log(TIMEOUTS.REQUEST.DEFAULT_MS);        // 30000
console.log(TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS); // 20000

// Get environment-specific config
const config = getTimeoutConfig('test');  // Returns test timeouts

// Validate hierarchy on startup
validateTimeoutHierarchy();  // Throws if hierarchy is invalid
```

### Environment Variables

Override timeout values via environment variables (advanced):

```bash
# Custom timeouts (not recommended - use constants)
export REQUEST_TIMEOUT_MS=45000
export DATABASE_STATEMENT_TIMEOUT_MS=25000
```

---

## Best Practices

### 1. Timeout Selection

**Quick Operations (<1s expected):**
```javascript
router.get('/status', quickTimeout(), handler);
// 5s timeout for health checks, status endpoints
```

**Standard Operations (1-10s expected):**
```javascript
router.get('/users', requestTimeout(), handler);
// Default 30s timeout for normal API operations
```

**Long Operations (10-60s expected):**
```javascript
router.post('/export', longTimeout(), handler);
// 90s timeout for reports, batch operations
```

### 2. Database Optimization

**Keep queries fast:**
```javascript
// BAD: Full table scan
SELECT * FROM users;

// GOOD: Indexed query with limit
SELECT * FROM users WHERE is_active = true LIMIT 50;
```

**Use indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
```

**Monitor slow queries:**
```sql
-- PostgreSQL slow query log
ALTER DATABASE trossapp_dev SET log_min_duration_statement = 1000;
```

### 3. Graceful Degradation

**Handle timeouts gracefully:**
```javascript
try {
  const result = await expensiveOperation();
  res.json(result);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Provide partial result or cached data
    const cached = await getCachedResult();
    res.status(200).json({
      data: cached,
      warning: 'Using cached data due to timeout',
      cached: true
    });
  } else {
    throw error;
  }
}
```

### 4. Early Timeout Detection

**Check timeout before expensive operations:**
```javascript
const { isTimeoutImminent, getRemainingTime } = require('../middleware/timeout');

async function batchOperation(req, items) {
  for (const item of items) {
    // Check if timeout is near
    if (isTimeoutImminent(req, 5000)) {  // 5s buffer
      logger.warn('Stopping batch operation due to timeout');
      break;
    }
    
    await processItem(item);
  }
}
```

---

## Troubleshooting

### Problem: Requests timing out frequently

**Diagnosis:**
1. Check slow request logs for patterns
2. Review database query performance
3. Check connection pool utilization

**Solutions:**
- Optimize slow queries (add indexes, reduce joins)
- Increase database pool size if needed
- Add caching for expensive operations
- Consider pagination for large result sets

### Problem: Database connection pool exhausted

**Diagnosis:**
```javascript
console.log('Pool status:', {
  total: db.pool.totalCount,
  idle: db.pool.idleCount,
  waiting: db.pool.waitingCount
});
```

**Solutions:**
- Ensure all queries properly release connections
- Reduce `statement_timeout` to free stuck connections faster
- Increase pool size (max) if needed
- Check for connection leaks in code

### Problem: Slow requests not being logged

**Diagnosis:**
- Verify timeout middleware is loaded: check `backend/server.js`
- Check logger configuration
- Verify `logSlowRequests: true` in timeout options

**Solutions:**
```javascript
// Ensure timeout middleware is early in chain
app.use(securityHeaders());
app.use(requestTimeout(TIMEOUTS.REQUEST.DEFAULT_MS));  // <-- Must be early
app.use(requestLogger);
```

### Problem: Timeout hierarchy validation failing

**Error:**
```
Timeout hierarchy validation failed:
Database timeout must be less than request timeout
```

**Solution:**
Ensure proper ordering in `backend/config/timeouts.js`:
```javascript
DATABASE.STATEMENT_TIMEOUT_MS < REQUEST.DEFAULT_MS < SERVER.REQUEST_TIMEOUT_MS
```

---

## Testing

### Unit Tests

Test timeout configuration:
```javascript
describe('Timeout Configuration', () => {
  it('should have valid timeout hierarchy', () => {
    expect(TIMEOUTS.DATABASE.STATEMENT_TIMEOUT_MS)
      .toBeLessThan(TIMEOUTS.REQUEST.DEFAULT_MS);
  });
});
```

### Integration Tests

Test timeout behavior:
```javascript
describe('Request Timeout', () => {
  it('should timeout slow operations', async () => {
    const response = await request(app)
      .get('/api/slow-endpoint')
      .expect(408);
    
    expect(response.body).toHaveProperty('timeout');
  });
});
```

### Load Testing

Test timeout behavior under load:
```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/users

# Artillery
artillery quick --count 100 --num 10 http://localhost:3001/api/users
```

---

## Migration Guide

### Existing Endpoints

No changes required! Timeout middleware is automatically applied to all routes.

### Custom Timeouts

Update routes needing custom timeouts:

**Before:**
```javascript
router.get('/export', authenticateToken, handler);
```

**After:**
```javascript
const { longTimeout } = require('../middleware/timeout');
router.get('/export', authenticateToken, longTimeout(), handler);
```

### Database Queries

No changes required! Pool configuration is updated automatically.

---

## Performance Impact

**Overhead:** <1ms per request (timeout tracking)
**Memory:** ~100 bytes per active request (timer + metadata)
**CPU:** Negligible (setTimeout is optimized in Node.js)

**Benefits:**
- Prevents server resource exhaustion
- Fast failure instead of hanging requests
- Better visibility into slow operations
- Improved user experience (predictable timeouts)

---

## Related Documentation

- [Database Architecture](../architecture/DATABASE_ARCHITECTURE.md)
- [API Documentation](../api/README.md)
- [Performance Optimization](./PERFORMANCE.md)
- [Monitoring & Logging](./LOGGING.md)

## Support

For questions or issues related to timeout configuration:

1. Check this documentation first
2. Review timeout logs in `backend/logs/`
3. Run integration tests: `npm run test:integration`
4. Open GitHub issue with timeout logs and configuration

---

**Next Steps:**
- Review [Testing Guide](../testing/TESTING_GUIDE.md) for timeout test patterns
- Configure monitoring alerts for timeout thresholds
- Optimize slow queries identified in logs
