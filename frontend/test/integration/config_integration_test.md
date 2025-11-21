# AppConfig Integration Tests

## Two-Axis Configuration Matrix Testing

These tests verify the correct behavior of all four configuration combinations.

### Test Matrix

| # | Frontend Mode | Backend Target | Dev Auth | Test Command |
|---|---------------|----------------|----------|--------------|
| 1 | Local | Local | ✅ YES | `npm run dev:frontend` |
| 2 | Local | Railway | ❌ NO | `npm run dev:frontend:prod-backend` |
| 3 | Deployed | Local | ❌ NO | N/A (nonsensical) |
| 4 | Deployed | Railway | ❌ NO | Production build |

### Manual Integration Tests

#### Test 1: Local Frontend + Local Backend (Daily Development)
```bash
# Start local backend
npm run dev:backend

# Start frontend
npm run dev:frontend
```

**Expected Behavior:**
- ✅ Health badge shows localhost:3001 status
- ✅ Dev auth button visible
- ✅ Can login with "Get Admin Token"
- ✅ Auth0 login also available
- ✅ Callback URL: `http://localhost:8080/callback`

**Verification:**
```dart
expect(AppConfig.isLocalFrontend, isTrue);
expect(AppConfig.useProdBackend, isFalse);
expect(AppConfig.devAuthEnabled, isTrue);
expect(AppConfig.backendUrl, 'http://localhost:3001');
expect(AppConfig.callbackUrl, 'http://localhost:8080/callback');
```

---

#### Test 2: Local Frontend + Railway Backend (Production Testing)
```bash
# NO local backend needed - using Railway

# Start frontend in prod-backend mode
npm run dev:frontend:prod-backend
```

**Expected Behavior:**
- ✅ Health badge shows Railway status
- ❌ Dev auth button HIDDEN (security)
- ✅ Only Auth0 login available
- ✅ Callback URL: `http://localhost:8080/callback` (localhost!)
- ✅ API calls go to Railway
- ✅ Can test production backend with real Auth0

**Verification:**
```dart
expect(AppConfig.isLocalFrontend, isTrue);
expect(AppConfig.useProdBackend, isTrue);
expect(AppConfig.devAuthEnabled, isFalse);  // CRITICAL!
expect(AppConfig.backendUrl, 'https://tross-api-production.up.railway.app');
expect(AppConfig.callbackUrl, 'http://localhost:8080/callback');  // Still localhost!
```

**Security Validation:**
- Cannot click "Get Admin Token" (button doesn't exist)
- Cannot access `/api/dev/token` (backend returns 404 in production)
- Forces real Auth0 authentication

---

#### Test 3: Deployed Frontend + Railway Backend (Production)
```bash
# Build and deploy to Vercel
flutter build web
# Deploy to Vercel

# Access: https://trossapp.vercel.app
```

**Expected Behavior:**
- ✅ Health badge shows Railway status
- ❌ Dev auth button HIDDEN
- ✅ Only Auth0 login available
- ✅ Callback URL: `https://trossapp.vercel.app/callback`
- ✅ All API calls to Railway
- ✅ Production-ready

**Verification:**
```dart
expect(AppConfig.isLocalFrontend, isFalse);  // kDebugMode=false in builds
expect(AppConfig.useProdBackend, isTrue);     // Production build
expect(AppConfig.devAuthEnabled, isFalse);
expect(AppConfig.backendUrl, 'https://tross-api-production.up.railway.app');
expect(AppConfig.callbackUrl, 'https://trossapp.vercel.app/callback');
```

---

### Automated E2E Tests

#### Test: Dev Auth Visibility
```dart
testWidgets('dev auth only visible in correct configuration', (tester) async {
  await tester.pumpWidget(MaterialApp(home: LoginScreen()));
  
  if (AppConfig.devAuthEnabled) {
    expect(find.text('Get Admin Token'), findsWidgets);
  } else {
    expect(find.text('Get Admin Token'), findsNothing);
  }
});
```

#### Test: Backend URL Switching
```dart
test('backend URL switches based on USE_PROD_BACKEND flag', () {
  if (AppConfig.useProdBackend) {
    expect(AppConfig.backendUrl, contains('railway.app'));
  } else {
    expect(AppConfig.backendUrl, contains('localhost:3001'));
  }
});
```

#### Test: Security Rule Enforcement
```dart
test('dev auth disabled when targeting production backend', () {
  if (AppConfig.useProdBackend) {
    expect(AppConfig.devAuthEnabled, isFalse, 
      reason: 'Dev auth must be disabled when using production backend');
  }
});
```

---

### Regression Tests

#### Test: Callback URL Always Localhost in Local Dev
```dart
test('callback URL uses localhost when running flutter run', () {
  if (AppConfig.isLocalFrontend) {
    expect(AppConfig.callbackUrl, contains('localhost:8080'),
      reason: 'Auth0 callback must be localhost when testing locally');
  }
});
```

#### Test: No Dev Auth in Any Production Scenario
```dart
test('dev auth never available in production scenarios', () {
  if (!AppConfig.isLocalFrontend || AppConfig.useProdBackend) {
    expect(AppConfig.devAuthEnabled, isFalse,
      reason: 'Dev auth is a security risk in production');
  }
});
```

---

## Running Integration Tests

```bash
# Unit tests (mocked)
cd frontend && flutter test test/config/app_config_test.dart

# Integration test - local backend
npm run dev:backend &
npm run dev:frontend
# Manually verify: dev auth visible, localhost URLs

# Integration test - Railway backend
npm run dev:frontend:prod-backend
# Manually verify: dev auth HIDDEN, Railway URLs, localhost callback

# E2E tests
npm run test:e2e
```

---

## Test Coverage Goals

- ✅ All four configuration combinations tested
- ✅ Security rules enforced (dev auth matrix)
- ✅ URL switching verified
- ✅ Callback URL logic correct
- ✅ Backward compatibility maintained
- ✅ No regressions in existing tests
