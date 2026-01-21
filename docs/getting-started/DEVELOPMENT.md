# Development Guide

Daily development workflow and best practices.

---

## Development Workflow

### For Collaborators (Fork-Based Workflow)

**Initial Setup (Once):**
1. **Fork the repo:** Click "Fork" on `losamgmt/tross-app`
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/tross-app.git
   cd tross-app
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/losamgmt/tross-app.git
   git remote -v  # Verify: origin (your fork), upstream (main repo)
   ```

**Starting New Work:**
1. **Sync with upstream:**
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   git push origin main  # Update your fork
   ```
2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && flutter pub get
   ```

**Making Changes:**
1. **Write tests first** (TDD approach)
2. **Implement feature** (smallest possible change)
3. **Run all tests locally** (required before PR):
   ```bash
   npm test  # Must pass ✅
   ```
4. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```
5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

**Submitting PR:**
1. Go to **your fork** on GitHub
2. Click "Compare & pull request"
3. Set base: `losamgmt/tross-app:main`
4. Set compare: `YOUR-USERNAME/tross-app:feature/your-feature-name`
5. Fill out PR template (What, Why, Testing)
6. Submit PR

**After Submitting:**
- ✅ CI checks run automatically (backend tests, lint, build)
- ✅ Vercel deploys preview URL (test your changes visually)
- ⏳ Maintainer reviews code + runs E2E tests locally
- ⏳ Maintainer approves and merges

**Post-Merge:**
```bash
# Sync your fork with upstream
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

**Alternative: GitHub Codespaces**

Don't want to install Node/Flutter/PostgreSQL locally? Use Codespaces:
1. Go to your fork
2. Click "Code" → "Codespaces" → "Create codespace on main"
3. Wait 2 minutes for setup
4. Start coding in browser!

---

### For Maintainers (Branch-Based Workflow)

**Starting Your Day:**
1. Pull latest changes: `git pull origin main`
2. Update dependencies: `npm install && cd frontend && flutter pub get`
3. Run migrations: `cd backend && npm run migrate`
4. Start services: `npm run dev` (root) or `./scripts/start-dev.bat`
5. Verify tests pass: `npm test` (backend) + `flutter test` (frontend)

**Feature Development:**
1. **Create branch:** `git checkout -b feature/your-feature-name`
2. **Write tests first** (TDD approach)
3. **Implement feature** (smallest possible change)
4. **Run tests:** Verify all pass
5. **Commit:** Clear, atomic commits
6. **Push & PR:** Open pull request for review

**Reviewing Fork PRs:**
1. **Check CI:** Verify all checks pass (test, lint, build)
2. **Test preview:** Click Vercel preview URL
3. **Checkout PR locally:**
   ```bash
   git fetch origin pull/PR_NUMBER/head:pr-PR_NUMBER
   git checkout pr-PR_NUMBER
   npm install && cd backend && npm install && cd ../frontend && flutter pub get
   ```
4. **Run full test suite:**
   ```bash
   npm run test:all  # All tests must pass ✅
   ```
5. **Review code:** Check architecture, security, tests
6. **Approve:** GitHub PR review → "Approve"
7. **Merge:** Squash and merge (clean history)

---

## Code Organization

### Backend Structure
```
backend/
├── server.js              # Express app entry
├── routes/                # API endpoints
│   ├── auth.js            # Auth/session routes
│   ├── entities.js        # Generic CRUD router factory (all entities)
│   └── roles-extensions.js # Non-CRUD role-specific endpoints
├── db/
│   ├── connection.js      # Database pool
│   └── models/            # Data access layer
├── middleware/            # Auth, validation, etc.
├── services/              # Business logic
├── validators/            # Input validation
└── __tests__/             # Jest tests
    ├── unit/
    └── integration/
```

### Frontend Structure
```
frontend/lib/
├── main.dart              # App entry
├── config/                # Configuration
├── models/                # Data models
├── providers/             # State management
├── services/              # API clients
├── widgets/               # UI components
│   ├── atoms/             # Buttons, inputs
│   ├── molecules/         # Composed components
│   └── organisms/         # Complex components
└── screens/               # Full pages
```

---

## Testing Philosophy

### Backend Testing
**Pyramid:** Unit → Integration → E2E

**Unit Tests** (`__tests__/unit/`)
- Test single functions/methods
- Mock external dependencies
- Fast (<5s timeout)
- Example: Model validation, service logic

**Integration Tests** (`__tests__/integration/`)
- Test API endpoints + database
- Use test database
- Moderate speed (<10s timeout)
- Example: Full CRUD workflows

**Run Tests:**
```bash
cd backend
npm test              # All tests
npm run test:unit     # Unit only
npm run test:integration  # Integration only
npm run test:watch    # Watch mode
```

### Frontend Testing
**Widget Tests** (`test/widgets/`)
- Test UI components in isolation
- Verify rendering and interactions
- Fast feedback

**Integration Tests**
- Test full user flows
- Provider integration
- Navigation flows

**Run Tests:**
```bash
cd frontend
flutter test                    # All tests
flutter test test/widgets/      # Widget tests only
flutter test --coverage         # With coverage
```

---

## Development Patterns

### Adding a New Entity

**1. Database Migration**
```bash
cd backend
npm run migrate:create add_entity_table

# Edit migration file:
# - Add TIER 1 fields (id, identity_field, is_active, created_at, updated_at)
# - Add TIER 2 fields (status, if needed)
# - Add indexes

npm run migrate
```

**2. Create Entity Metadata** (`backend/config/models/entity-metadata.js`)

Entity metadata is the SINGLE SOURCE OF TRUTH for entity configuration.
See existing metadata files for the complete pattern.

```javascript
module.exports = {
  tableName: 'entities',
  primaryKey: 'id',
  identityField: 'name',
  rlsResource: 'entities',
  rlsPolicy: {
    customer: 'own_record_only',
    admin: 'all_records',
  },
  routeConfig: { useGenericRouter: true },
  // ... fields, validation, etc.
};
```

**3. Register in Index** (`backend/config/models/index.js`)

Add your entity to the metadata exports.

**4. Create Routes** (automatic via generic router)
```javascript
router.get('/', authenticateToken, requirePermission('entities:read'), async (req, res) => {
  // GET /api/entities
});

router.post('/', authenticateToken, requirePermission('entities:create'), async (req, res) => {
  // POST /api/entities
});
```

**4. Add Tests**
- Unit: `__tests__/unit/models/Entity.crud.test.js`
- Integration: `__tests__/integration/entities-api.test.js`

**5. Frontend Model** (`frontend/lib/models/entity_model.dart`)
```dart
class Entity {
  final int id;
  final String name;
  final bool isActive;
  
  Entity.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      name = json['name'],
      isActive = json['is_active'];
}
```

---

## Git Workflow

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add customer filtering by status
fix: resolve null pointer in user validation
test: add integration tests for work orders
docs: update architecture decision for RLS
refactor: extract common validation logic
```

### Branch Naming
```
feature/customer-filtering
fix/user-validation-bug
test/work-order-integration
docs/architecture-update
refactor/validation-extraction
```

### Pull Request Template
```markdown
## What
Brief description of changes

## Why
Rationale for the change

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Tests pass locally
- [ ] No console errors
- [ ] Documentation updated
```

---

## Code Style

### Backend (JavaScript)
- **ESLint:** Follow `.eslintrc.js`
- **Naming:** camelCase for variables, PascalCase for classes
- **Async:** Always use `async/await`, not callbacks
- **Errors:** Always wrap in try-catch, never swallow
- **Comments:** Explain WHY, not WHAT

**Good:**
```javascript
// Strategy pattern allows swapping auth methods in dev vs prod
const strategy = AppConfig.devAuthEnabled 
  ? new DevelopmentStrategy() 
  : new Auth0Strategy();
```

**Bad:**
```javascript
// Create strategy
const strategy = new Strategy();
```

### Frontend (Dart)
- **Linter:** Follow `analysis_options.yaml`
- **Naming:** camelCase for variables, PascalCase for classes
- **Widgets:** Prefer const constructors
- **State:** Provider for global, StatefulWidget for local

---

## Database Migrations

### Creating Migrations
```bash
cd backend
npm run migrate:create your_migration_name

# Edit migrations/YYYYMMDDHHMMSS_your_migration_name.js
# Implement up() and down()

npm run migrate          # Apply
npm run migrate:rollback # Undo last
```

### Migration Best Practices
- **One change per migration**
- **Always write `down()`** (rollback)
- **Test rollback** before merging
- **Never edit applied migrations** (create new one)

---

## Debugging

### Backend Debugging
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Inspect database queries
# Add to .env:
DEBUG_SQL=true

# View logs
tail -f backend/logs/combined.log
```

### Frontend Debugging
```bash
# Flutter DevTools
flutter run -d chrome --observatory-port=9200

# Widget inspector
# Open Chrome DevTools while running
```

### Frontend Logging Strategy

Use `ErrorService` for all logging. This ensures:
- **Silent in production** (no console spam for users)
- **Silent in tests** (clean test output)
- **Active in local dev** (full debugging)

**Log Levels:**
```dart
// Error - Always logged to developer.log, prints in debug mode
ErrorService.logError('Failed to load data', error: e, context: {'id': 123});

// Warning - Shows in debug mode, useful for deprecations/issues
ErrorService.logWarning('Config may be stale', context: {'version': '1.0'});

// Info - General flow information (debug mode only)
ErrorService.logInfo('User logged in', context: {'email': user.email});

// Debug - Verbose tracing (debug mode only, not in tests)
ErrorService.logDebug('Permission check', context: {'role': role, 'resource': res});
```

**Never use:**
- `print()` directly - not environment-aware
- `debugPrint()` directly - use `ErrorService.logDebug()` instead

**Why?**
- `kDebugMode` is false in production Flutter web builds
- `isInTestMode` prevents log pollution during `flutter test`
- Centralized control over all logging behavior

---

## Performance

### Backend Performance
- **Connection pooling:** Max 20 connections (configured)
- **Slow query logging:** Warns on queries >100ms
- **Request timeout:** 30s max
- **Rate limiting:** 100 req/min per IP

### Frontend Performance
- **Lazy loading:** Use `ListView.builder` for long lists
- **Const constructors:** Reduce rebuilds
- **Avoid `setState()` in build:** Move to initState/didChangeDependencies

---

## Security Checklist

**Before Every Commit:**
- [ ] No secrets in code (use .env)
- [ ] Input validation on all endpoints
- [ ] SQL queries use parameterized statements
- [ ] Auth middleware on protected routes
- [ ] RBAC permission checks in place
- [ ] Error messages don't leak sensitive info

---

## Troubleshooting

### Backend Won't Start
```bash
# Check environment variables
cd backend
node -e "require('./config/app-config'); console.log('✓ Config valid')"

# Verify database connection
psql -d trossapp_dev -c "SELECT 1"

# Check port availability
npx kill-port 3001
```

### Tests Failing
```bash
# Reset test database
cd backend
npm run db:reset:test

# Run tests in isolation
npm test -- --testPathPattern=customers

# Verbose mode
npm test -- --verbose
```

### Frontend Build Errors
```bash
cd frontend
flutter clean
rm -rf pubspec.lock
flutter pub get
flutter run -d chrome
```

---

## Next Steps

- **[Architecture](ARCHITECTURE.md)** - Understand core patterns
- **[Testing Guide](TESTING.md)** - Deep dive into testing
- **[API Documentation](API.md)** - Explore endpoints
- **[Deployment](DEPLOYMENT.md)** - Deploy to production
