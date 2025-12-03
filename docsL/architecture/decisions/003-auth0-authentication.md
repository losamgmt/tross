# ADR 003: Auth0 for Authentication

**Status:** ✅ Accepted  
**Deciders:** Development Team

---

## Context

TrossApp requires secure authentication with:

- **Multiple platforms:** Web (Flutter Web), iOS, Android
- **OAuth 2.0 / OIDC:** Industry-standard auth
- **Social login:** Future support for Google/Microsoft
- **Role-based access:** Admin vs. regular users
- **Session management:** Token refresh, logout
- **Security:** Production-grade authentication

Options considered:

1. **Auth0** - SaaS authentication platform
2. **Firebase Auth** - Google's auth service
3. **Supabase Auth** - Open-source Firebase alternative
4. **Custom JWT** - Roll our own authentication
5. **Keycloak** - Self-hosted open-source

---

## Decision

We chose **Auth0** for production authentication with **dev mode fallback** for local development.

### Why Auth0?

#### ✅ Multi-Platform Support

- **Web:** Universal Login (redirect flow)
- **iOS:** Native SDK with biometrics
- **Android:** Native SDK with secure storage
- **Single codebase** with platform-specific implementations

#### ✅ Production-Ready Security

- OIDC/OAuth 2.0 compliant
- PKCE for mobile apps
- Automatic token rotation
- Anomaly detection
- Breach detection
- MFA support (future)

#### ✅ Developer Experience

- Excellent documentation
- Flutter SDKs available
- Free tier: 7,000 users
- Quick setup (< 30 min)
- Dashboard for user management

#### ✅ Future Features

- Social login ready (Google, Microsoft, GitHub)
- Passwordless auth
- Enterprise SSO
- Advanced rules/hooks

---

## Implementation Architecture

### Platform Strategy Pattern

```dart
// Platform-agnostic interface
abstract class Auth0PlatformService {
  static bool get isWeb => kIsWeb;

  Future<AuthResult> login();
  Future<void> logout();
  Future<String?> getStoredToken();
}

// Web implementation
class Auth0WebService implements Auth0PlatformService {
  // Uses auth0_flutter_web package
  // Redirect-based flow
}

// Mobile implementation (iOS/Android)
class Auth0MobileService implements Auth0PlatformService {
  // Uses auth0_flutter package
  // Native SDK with secure storage
}
```

### Dev Mode Fallback

For local development without Auth0 setup:

```dart
// backend/routes/dev-auth.js
router.post('/dev-auth/login', (req, res) => {
  const { email } = req.body;
  const user = TEST_USERS[email]; // From config
  const token = generateJWT(user);
  res.json({ accessToken: token, user });
});
```

Allows testing without Auth0:

- Admin user: `admin@trossapp.com` / `admin123`
- Client user: `client@trossapp.com` / `client123`

---

## Alternatives Considered

### Firebase Auth

- **Pros:**
  - Google ecosystem integration
  - Free generous limits
  - Easy Flutter integration
- **Cons:**
  - Vendor lock-in to Google
  - Less flexible than Auth0
  - Harder to migrate away
- **Decision:** Too coupled to Firebase ecosystem

### Supabase Auth

- **Pros:**
  - Open source
  - PostgreSQL-based
  - Self-hostable
- **Cons:**
  - Newer, less proven
  - Flutter SDK less mature
  - Requires running Supabase stack
- **Decision:** Too early-stage for production

### Custom JWT Implementation

- **Pros:**
  - Full control
  - No external dependencies
  - No monthly costs
- **Cons:**
  - **Security risk:** Hard to get right
  - Must implement: token refresh, password hashing, session management
  - Ongoing maintenance burden
  - No social login
- **Decision:** **Too risky** - auth is too critical to DIY

### Keycloak

- **Pros:**
  - Open source
  - Full-featured
  - Self-hosted
- **Cons:**
  - Heavy infrastructure (Java, Docker, DB)
  - Complex setup and maintenance
  - Overkill for our needs
- **Decision:** Too complex for startup MVP

---

## Consequences

### Positive ✅

**Security:**

- ✅ Production-grade auth from day 1
- ✅ Automatic security updates from Auth0
- ✅ Compliance features (GDPR, SOC2)
- ✅ Token rotation and refresh handled

**Development Velocity:**

- ✅ < 30 min setup time
- ✅ Dev mode for offline development
- ✅ No auth maintenance burden
- ✅ Focus on business logic

**User Experience:**

- ✅ Fast login (~2 seconds)
- ✅ Consistent across platforms
- ✅ Future: Biometric login on mobile
- ✅ Future: Social login

### Negative ⚠️

**Costs:**

- Free tier: 7,000 users
- After: ~$23/month (up to 1,000 active users)
- Scale pricing beyond that

**Vendor Lock-in:**

- Switching providers requires migration
- Auth0-specific features hard to replicate

**Complexity:**

- Platform-specific implementations needed
- Redirect flow on web adds complexity
- Token management requires careful handling

### Mitigations 🛡️

**Cost Management:**

- Monitor monthly active users
- Free tier sufficient for MVP + early growth
- Budget for auth in pricing model

**Lock-in Mitigation:**

- Standard OIDC/OAuth 2.0 (portable)
- User data exportable
- Can switch to Supabase/Keycloak later if needed

**Complexity Management:**

- Platform service pattern abstracts differences
- Comprehensive tests (100% auth provider coverage)
- Dev mode simplifies local testing

---

## Configuration

### Auth0 Setup

```javascript
// backend/config/auth0.js
module.exports = {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  audience: process.env.AUTH0_AUDIENCE,
};
```

### Frontend Config

```dart
// frontend/lib/config/auth0_config.dart
class Auth0Config {
  static const String domain = 'trossapp.us.auth0.com';
  static const String clientId = 'YOUR_CLIENT_ID';
  static const String audience = 'https://api.trossapp.com';

  static const String redirectUri = kIsWeb
      ? 'http://localhost:5000/auth/callback'
      : 'com.trossapp://callback';
}
```

---

## Validation

### Security Testing

- ✅ Token validation working
- ✅ Expired token handling
- ✅ Refresh token rotation
- ✅ Logout clears all tokens
- ✅ PKCE implemented for mobile

### Performance Testing

- Login time: ~2 seconds (web redirect flow)
- Token refresh: <500ms
- API calls: Auto-refresh on 401

### Test Coverage

- ✅ `AuthProvider`: 100% coverage
- ✅ `AuthService`: 100% coverage
- ✅ `Auth0PlatformService`: 100% coverage
- ✅ Token management: Fully tested
- ✅ E2E auth flows: Comprehensive coverage

---

## References

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Flutter SDK](https://github.com/auth0/auth0-flutter)
- Setup Guide: `docs/AUTH0_SETUP.md`
- Integration Guide: `docs/AUTH0_INTEGRATION.md`
- Architecture: `docs/auth/FLUTTER_AUTH_ARCHITECTURE.md`
- Implementation:
  - Backend: `backend/middleware/auth.js`
  - Frontend: `frontend/lib/services/auth/`

---

**Last Reviewed:** October 27, 2025  
**Status:** Active in production, dev mode working perfectly
