# Proactive Token Refresh Implementation Plan

**Created:** January 30, 2026  
**Status:** 📋 Planned  
**Priority:** High (UX-critical)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current Architecture](#2-current-architecture)
3. [Gap Analysis](#3-gap-analysis)
4. [Proposed Solution](#4-proposed-solution)
5. [Implementation Steps](#5-implementation-steps)
6. [Testing Strategy](#6-testing-strategy)
7. [Rollout Plan](#7-rollout-plan)

---

## 1. Problem Statement

### 1.1 Issue

Users get **logged out abruptly** after periods of inactivity (15+ minutes) because the access token expires and there's no proactive refresh mechanism.

### 1.2 Impact

- Poor UX: Users lose work-in-progress when suddenly redirected to login
- Session feels unstable: Users can't trust the app to maintain their session
- Idle tabs break: Users opening the app after a lunch break face logout

### 1.3 Root Cause

The TODO in `token_manager.dart` (lines 3-6) states:
```dart
// TODO: Implement proactive token refresh before expiration.
// Current behavior: tokens expire and user gets logged out abruptly.
// Need: Background refresh ~5min before expiry, or on app resume.
```

---

## 2. Current Architecture

### 2.1 Token Settings

| Token Type | Expiration | Source |
|------------|------------|--------|
| Access Token | **15 minutes** | `backend/services/token-service.js` (`JWT_ACCESS_EXPIRY = '15m'`) |
| Refresh Token | **7 days** | `backend/services/token-service.js` (`JWT_REFRESH_EXPIRY = '7d'`) |

### 2.2 Current Refresh Flow (Reactive Only)

```
[API Request]
    ↓
[401 Unauthorized] ← Token expired
    ↓
[http_api_client.dart] → _refreshTokenWithMutex()
    ↓
[AuthService] → _handleTokenRefresh()
    ↓
[AuthTokenService] → refreshToken()
    ↓
[Backend /api/auth0/refresh] → Rotate tokens
    ↓
[Store new tokens] → Retry original request
```

### 2.3 Frontend Auth Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `TokenManager` | `lib/services/auth/token_manager.dart` | Secure storage (flutter_secure_storage) |
| `TokenProvider` | `lib/services/auth/token_provider.dart` | Injectable abstraction for testing |
| `AuthTokenService` | `lib/services/auth/auth_token_service.dart` | Token validation/refresh API calls |
| `AuthService` | `lib/services/auth/auth_service.dart` | Orchestrates login/logout/refresh |
| `AuthProvider` | `lib/providers/auth_provider.dart` | UI state (ChangeNotifier) |
| `Auth0Service` | `lib/services/auth/auth0_service.dart` | Mobile Auth0 SDK |
| `Auth0WebService` | `lib/services/auth/auth0_web_service.dart` | Web PKCE OAuth2 |
| `HttpApiClient` | `lib/services/api/http_api_client.dart` | 401 interceptor with mutex |

### 2.4 Backend Auth Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Auth Middleware | `backend/middleware/auth.js` | JWT verification, role checks |
| Auth Routes | `backend/routes/auth0.js` | /validate, /refresh, /logout |
| Token Service | `backend/services/token-service.js` | Token generation, rotation |

---

## 3. Gap Analysis

### 3.1 What's Missing

| Gap | Impact |
|-----|--------|
| No `expiresAt` stored | Frontend doesn't know when token expires |
| No Timer for refresh | No proactive refresh before expiry |
| No `WidgetsBindingObserver` | No refresh on app resume from background |
| No idle detection | Can't detect user returning after absence |

### 3.2 What's Working

| Feature | Status |
|---------|--------|
| Secure token storage | ✅ flutter_secure_storage |
| Backend token rotation | ✅ Refresh revokes old, issues new pair |
| 401 interceptor | ✅ Catches expired tokens, triggers refresh |
| Mutex for concurrent refresh | ✅ Prevents race conditions |
| Auth0 web PKCE flow | ✅ Full OAuth2 implementation |

---

## 4. Proposed Solution

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TokenRefreshManager                       │
│  (WidgetsBindingObserver + Timer-based proactive refresh)   │
├─────────────────────────────────────────────────────────────┤
│  Responsibilities:                                           │
│  1. Store expiresAt timestamp with token                    │
│  2. Set Timer for 2 minutes before expiry                   │
│  3. Listen for app resume (WidgetsBindingObserver)          │
│  4. Check token validity on resume                          │
│  5. Trigger refresh via AuthService when needed             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       AuthService                            │
│              (Existing orchestration layer)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     AuthTokenService                         │
│                   (Existing API calls)                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Refresh 2 min before expiry | Gives buffer for network latency |
| Use `WidgetsBindingObserver` | Standard Flutter pattern for lifecycle |
| Keep reactive 401 as fallback | Safety net if proactive fails |
| Store expiry in secure storage | Survives app restart |
| Single refresh manager | Centralized timer management |

---

## 5. Implementation Steps

### Phase 1: Store Token Expiry

**File:** `lib/services/auth/token_manager.dart`

```dart
// Add new storage key
static const String _expiresAtKey = 'token_expires_at';

// Store expiry timestamp (milliseconds since epoch)
Future<void> setTokenExpiry(DateTime expiresAt) async {
  await _storage.write(
    key: _expiresAtKey,
    value: expiresAt.millisecondsSinceEpoch.toString(),
  );
}

// Get expiry timestamp
Future<DateTime?> getTokenExpiry() async {
  final value = await _storage.read(key: _expiresAtKey);
  if (value == null) return null;
  return DateTime.fromMillisecondsSinceEpoch(int.parse(value));
}

// Clear expiry on logout
Future<void> clearTokenExpiry() async {
  await _storage.delete(key: _expiresAtKey);
}
```

### Phase 2: Calculate Expiry from JWT

**File:** `lib/services/auth/auth_token_service.dart`

```dart
import 'dart:convert';

/// Decode JWT and extract expiry timestamp
DateTime? getTokenExpiry(String token) {
  try {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    
    final payload = parts[1];
    // Add padding if needed
    final normalized = base64Url.normalize(payload);
    final decoded = utf8.decode(base64Url.decode(normalized));
    final json = jsonDecode(decoded) as Map<String, dynamic>;
    
    final exp = json['exp'] as int?;
    if (exp == null) return null;
    
    return DateTime.fromMillisecondsSinceEpoch(exp * 1000);
  } catch (e) {
    return null;
  }
}
```

### Phase 3: Create TokenRefreshManager

**File:** `lib/services/auth/token_refresh_manager.dart` (NEW)

```dart
import 'dart:async';
import 'package:flutter/widgets.dart';
import 'token_manager.dart';
import 'auth_service.dart';
import '../error_service.dart';

/// Proactive token refresh manager
/// 
/// Responsibilities:
/// 1. Timer-based refresh before token expiry
/// 2. App lifecycle awareness (refresh on resume)
/// 3. Coordinates with AuthService for actual refresh
class TokenRefreshManager with WidgetsBindingObserver {
  final TokenManager _tokenManager;
  final AuthService _authService;
  
  Timer? _refreshTimer;
  
  /// How long before expiry to trigger refresh
  static const Duration _refreshBuffer = Duration(minutes: 2);
  
  /// Minimum time to wait before checking again
  static const Duration _minRefreshInterval = Duration(seconds: 30);

  TokenRefreshManager({
    required TokenManager tokenManager,
    required AuthService authService,
  })  : _tokenManager = tokenManager,
        _authService = authService;

  /// Initialize the manager - call after successful login
  void initialize() {
    WidgetsBinding.instance.addObserver(this);
    _scheduleRefresh();
  }

  /// Dispose the manager - call on logout
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cancelTimer();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _onAppResumed();
    }
  }

  Future<void> _onAppResumed() async {
    final expiresAt = await _tokenManager.getTokenExpiry();
    if (expiresAt == null) return;
    
    final now = DateTime.now();
    
    if (now.isAfter(expiresAt)) {
      // Token already expired - let 401 handler deal with it
      // or trigger logout
      ErrorService.logWarning(
        'Token expired while app was backgrounded',
      );
    } else if (expiresAt.difference(now) < _refreshBuffer) {
      // Close to expiry - refresh now
      await _performRefresh();
    } else {
      // Still valid - reschedule timer
      _scheduleRefresh();
    }
  }

  void _scheduleRefresh() {
    _cancelTimer();
    
    _tokenManager.getTokenExpiry().then((expiresAt) {
      if (expiresAt == null) return;
      
      final now = DateTime.now();
      final refreshAt = expiresAt.subtract(_refreshBuffer);
      
      if (refreshAt.isBefore(now)) {
        // Should refresh now
        _performRefresh();
      } else {
        // Schedule for later
        final delay = refreshAt.difference(now);
        _refreshTimer = Timer(delay, _performRefresh);
      }
    });
  }

  Future<void> _performRefresh() async {
    try {
      await _authService.refreshToken();
      // Reschedule for next refresh
      _scheduleRefresh();
    } catch (e) {
      ErrorService.logError('Proactive token refresh failed', error: e);
      // Don't reschedule - let 401 handler deal with next request
    }
  }

  void _cancelTimer() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }
}
```

### Phase 4: Integrate with AuthService

**File:** `lib/services/auth/auth_service.dart`

Add calls to store expiry after successful login/refresh:

```dart
// After successful token acquisition
final accessToken = response.accessToken;
final expiry = authTokenService.getTokenExpiry(accessToken);
if (expiry != null) {
  await tokenManager.setTokenExpiry(expiry);
}
```

### Phase 5: Initialize in App Bootstrap

**File:** `lib/main.dart` or `lib/providers/auth_provider.dart`

```dart
// After successful auth initialization
if (isAuthenticated) {
  _tokenRefreshManager.initialize();
}

// On logout
void logout() {
  _tokenRefreshManager.dispose();
  // ... existing logout logic
}
```

### Phase 6: Update clearAll in TokenManager

**File:** `lib/services/auth/token_manager.dart`

```dart
Future<void> clearAll() async {
  await _storage.delete(key: _accessTokenKey);
  await _storage.delete(key: _refreshTokenKey);
  await _storage.delete(key: _userIdKey);
  await _storage.delete(key: _expiresAtKey); // Add this
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

| Test | Description |
|------|-------------|
| `getTokenExpiry` parses JWT correctly | Verify exp claim extraction |
| `setTokenExpiry` stores value | Verify secure storage write |
| `TokenRefreshManager` schedules timer | Verify timer set for correct time |
| `TokenRefreshManager` handles app resume | Verify refresh on lifecycle change |

### 6.2 Integration Tests

| Test | Description |
|------|-------------|
| Token refresh before expiry | Simulate 15-min token, verify refresh at 13 min |
| App resume after idle | Background app, wait, resume, verify token check |
| Failed refresh fallback | Simulate refresh failure, verify 401 still works |

### 6.3 Manual Testing Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| Login, wait 13 minutes | Token refreshes silently, no logout |
| Login, wait 20 minutes idle | Token expired, refresh attempted on next action |
| Login, background app 10 min, resume | Token checked on resume, refreshed if needed |
| Login, background app 20 min, resume | Token expired, graceful logout or refresh |

---

## 7. Rollout Plan

### 7.1 Implementation Order

1. **Phase 1-2:** Token expiry storage (low risk)
2. **Phase 3:** TokenRefreshManager (new file, isolated)
3. **Phase 4:** AuthService integration (careful merge)
4. **Phase 5:** App bootstrap integration
5. **Phase 6:** Cleanup and testing

### 7.2 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Timer not cancelled on logout | Explicit dispose() call in logout flow |
| Race condition with 401 handler | Use existing mutex pattern |
| Web platform lifecycle differences | Test on web specifically, may need workarounds |
| Token parse failure | Fallback to reactive-only behavior |

### 7.3 Rollback Plan

If issues arise:
1. Remove `TokenRefreshManager.initialize()` call
2. Reactive 401 refresh continues to work as before
3. No user-facing impact (just loses proactive refresh)

---

## Related Documents

- [PROJECT_STATUS.md](../PROJECT_STATUS.md) - Project roadmap
- [WIDGET_ARCHITECTURE_AUDIT.md](WIDGET_ARCHITECTURE_AUDIT.md) - Widget cleanup plan
- [AUTH.md](../AUTH.md) - Auth system overview

---

*This plan addresses the TODO in token_manager.dart and ensures smooth session persistence.*
