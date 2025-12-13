# Troubleshooting Guide

Common issues and solutions for TrossApp development and deployment.

## Quick Diagnostics

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check database connection
cd backend && npm run db:migrate:status

# Run quick smoke test
cd backend && npm test -- --testNamePattern="health" --detectOpenHandles
```

## Common Issues

### 1. Server Won't Start

#### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use the helper script
npm run kill-ports
```

#### Missing Environment Variables

**Error**: `JWT_SECRET must be set` or similar

**Solution**:
```bash
# Create .env from template
cp .env.example .env

# Verify required vars are set
cat .env | grep -E "^(DATABASE|JWT|AUTH0)"
```

---

### 2. Database Issues

#### Connection Refused

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Causes & Solutions**:
1. **PostgreSQL not running**
   ```bash
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   
   # Docker
   docker compose up db -d
   ```

2. **Wrong connection details**
   ```bash
   # Verify DATABASE_URL format
   # postgresql://user:password@host:port/database
   ```

#### Migration Failed

**Error**: `relation "users" does not exist`

**Solution**:
```bash
cd backend
npm run db:migrate:latest
npm run db:seed:run  # Optional: seed test data
```

#### Pool Exhausted

**Error**: `too many clients already` or `remaining connection slots reserved`

**Solution**:
1. Check for connection leaks in code (missing `release()` calls)
2. Increase pool size:
   ```env
   DB_POOL_MAX=20
   ```
3. Add connection timeout:
   ```env
   DB_CONNECTION_TIMEOUT=30000
   ```

---

### 3. Authentication Issues

#### JWT Verification Failed

**Error**: `JsonWebTokenError: invalid signature`

**Causes**:
1. `JWT_SECRET` mismatch between token creation and verification
2. Token was created with different secret

**Solution**:
```bash
# Ensure same secret across environments
echo $JWT_SECRET

# Get fresh dev token
curl http://localhost:3001/api/dev/token?role=admin
```

#### 401 Unauthorized

**Checklist**:
- [ ] Token included in `Authorization: Bearer <token>` header
- [ ] Token not expired (check `exp` claim)
- [ ] Token has required role for endpoint

```bash
# Decode token (without verification)
echo "<token>" | cut -d. -f2 | base64 -d | jq
```

#### Auth0 Errors

**Error**: `Unable to verify token: Auth0 domain not configured`

**Solution**:
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.yourapp.com
```

---

### 4. CORS Errors

**Error**: `Access-Control-Allow-Origin` header missing

**Solution**:
```env
# Add all frontend origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,https://yourapp.com
```

**Note**: Don't use `*` in production - explicitly list allowed origins.

---

### 5. Test Failures

#### Database State Issues

**Error**: Tests fail intermittently with duplicate key or missing data

**Solution**:
```bash
# Reset test database
NODE_ENV=test npm run db:migrate:rollback --all
NODE_ENV=test npm run db:migrate:latest

# Run tests with fresh database
npm test -- --runInBand
```

#### Timeout Errors

**Error**: `Timeout - Async callback was not invoked within 5000ms`

**Solution**:
```javascript
// Increase Jest timeout for slow tests
jest.setTimeout(30000);

// Or per-test
test('slow operation', async () => {
  // ...
}, 30000);
```

#### Open Handle Warnings

**Error**: `Jest did not exit one second after the test run completed`

**Solution**:
```bash
# Find the leak
npm test -- --detectOpenHandles

# Common fixes:
# - Close database connections in afterAll()
# - Clear timers with jest.clearAllTimers()
# - Close server instances
```

---

### 6. Build Issues

#### TypeScript Errors (Frontend)

**Error**: `TS2307: Cannot find module`

**Solution**:
```bash
cd frontend
flutter clean
flutter pub get
```

#### Node Modules Issues

**Error**: Various dependency errors

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or force resolution
npm install --legacy-peer-deps
```

---

### 7. Docker Issues

#### Container Won't Start

**Check logs**:
```bash
docker compose logs backend
docker compose logs db
```

#### Volume Permission Errors

**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Fix permissions
sudo chown -R $(whoami) ./data

# Or use named volumes instead of bind mounts
```

#### Database Not Ready

**Error**: Backend starts before database is ready

**Solution**: docker-compose.yml should have health check:
```yaml
depends_on:
  db:
    condition: service_healthy
```

---

### 8. Performance Issues

#### Slow API Responses

**Diagnostics**:
```bash
# Check response time
time curl http://localhost:3001/api/users

# Check database query time
npm run db:debug
```

**Solutions**:
1. Add database indexes for frequently queried columns
2. Implement pagination (already done in most endpoints)
3. Check for N+1 queries in related data fetching

#### High Memory Usage

**Diagnostics**:
```bash
# Check Node memory
node --max-old-space-size=4096 server.js

# Profile memory
NODE_OPTIONS="--inspect" npm start
```

---

## Logging & Debugging

### Enable Debug Logging

```env
LOG_LEVEL=debug
DEBUG=*
```

### View Backend Logs

```bash
# Development
npm run dev 2>&1 | tee backend.log

# Production (Railway)
railway logs

# Docker
docker compose logs -f backend
```

### Database Query Logging

```env
# In .env
DEBUG=knex:query
```

---

## Getting Help

1. **Check existing docs**: See `/docs` folder
2. **Search issues**: Check GitHub issues for similar problems
3. **Ask team**: Post in team Slack/Discord
4. **Create issue**: Include error message, steps to reproduce, and environment info

### Information to Include

```
- OS: Windows/macOS/Linux
- Node version: `node --version`
- npm version: `npm --version`
- Error message (full stack trace)
- Steps to reproduce
- Relevant environment variables (redact secrets!)
```
