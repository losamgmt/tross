# ADR 004: Routing & Navigation Strategy

**Status:** Accepted  
**Decision Makers:** Development Team  
**Outcome:** Imperative Navigation with Programmatic Guards

---

## Context

TrossApp requires a robust routing system that supports:

- Role-based access control (admin/manager/user routes)
- Authentication state management (public vs protected routes)
- Deep linking for web deployment
- Clear navigation flow with minimal boilerplate

The Flutter ecosystem offers several routing approaches, each with different trade-offs around complexity, type safety, and developer experience.

---

## Decision

**Use Flutter's imperative Navigator API with custom programmatic navigation guards.**

### Implementation

**Core Components:**

1. **Route definitions** in `lib/core/routes.dart`
2. **Navigation guards** for auth/role checks
3. **Programmatic routing** via `Navigator.pushNamed()`
4. **Route factories** for dynamic route generation

**Example:**

```dart
// lib/core/routes.dart
class AppRoutes {
  static const String home = '/';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String adminPanel = '/admin';

  static Map<String, WidgetBuilder> getRoutes(BuildContext context) {
    return {
      home: (context) => HomeScreen(),
      login: (context) => LoginScreen(),
      dashboard: (context) => _guardRoute(
        context,
        DashboardScreen(),
        requiresAuth: true,
      ),
      adminPanel: (context) => _guardRoute(
        context,
        AdminPanelScreen(),
        requiresAuth: true,
        requiresRole: 'admin',
      ),
    };
  }

  static Widget _guardRoute(
    BuildContext context,
    Widget screen, {
    bool requiresAuth = false,
    String? requiresRole,
  }) {
    final authProvider = context.read<AuthProvider>();

    if (requiresAuth && !authProvider.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, login);
      });
      return LoadingScreen();
    }

    if (requiresRole != null &&
        !authProvider.user?.hasRole(requiresRole)) {
      return UnauthorizedScreen();
    }

    return screen;
  }
}
```

**Navigation usage:**

```dart
// Programmatic navigation
Navigator.pushNamed(context, AppRoutes.dashboard);

// With arguments
Navigator.pushNamed(
  context,
  AppRoutes.userProfile,
  arguments: {'userId': userId},
);

// Replacement (no back button)
Navigator.pushReplacementNamed(context, AppRoutes.login);
```

---

## Alternatives Considered

### 1. **GoRouter** ⭐ (Modern, Declarative)

**Why considered:** Official Flutter navigation library with declarative routing.

**Pros:**

- ✅ Type-safe route parameters
- ✅ Deep linking support built-in
- ✅ Declarative route definitions
- ✅ Built-in redirect/guard mechanism
- ✅ URL-based navigation for web

**Cons:**

- ❌ Adds dependency (go_router package)
- ❌ Learning curve for team
- ❌ More complex setup for simple apps
- ❌ Overkill for current routing needs

**Example:**

```dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => HomeScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) => DashboardScreen(),
      redirect: (context, state) {
        if (!authProvider.isAuthenticated) {
          return '/login';
        }
        return null;
      },
    ),
  ],
);
```

**Why not chosen:** KISS principle - too much infrastructure for current routing needs.

---

### 2. **Navigator 2.0 / Router API** (Advanced, Low-level)

**Why considered:** Full control over navigation stack and state.

**Pros:**

- ✅ Complete control over navigation state
- ✅ Supports complex nested navigation
- ✅ Platform-agnostic declarative API

**Cons:**

- ❌ Extremely verbose boilerplate
- ❌ Steep learning curve
- ❌ Requires RouterDelegate, RouteInformationParser
- ❌ Hard to maintain

**Example complexity:**

```dart
class AppRouterDelegate extends RouterDelegate with ChangeNotifier {
  // 200+ lines of boilerplate for basic routing
  @override
  Widget build(BuildContext context) { /* ... */ }

  @override
  Future<void> setNewRoutePath(configuration) async { /* ... */ }
}

class AppRouteInformationParser extends RouteInformationParser {
  // Another 100+ lines
}
```

**Why not chosen:** Too complex for our app's routing requirements.

---

### 3. **Auto-Route** (Code Generation)

**Why considered:** Generates routing code from annotations.

**Pros:**

- ✅ Type-safe navigation
- ✅ Auto-generated routes
- ✅ Guards and middleware support

**Cons:**

- ❌ Requires code generation step
- ❌ Adds build complexity
- ❌ Magic that obscures routing logic
- ❌ Harder to debug

**Example:**

```dart
@MaterialAutoRouter(
  routes: [
    AutoRoute(page: HomeScreen, initial: true),
    AutoRoute(page: DashboardScreen, guards: [AuthGuard]),
  ],
)
class $AppRouter {}

// Generated code in app_router.gr.dart (100+ lines)
```

**Why not chosen:** Adds unnecessary build step and complexity.

---

### 4. **Fluro** (Older Library)

**Why considered:** Popular routing library in early Flutter days.

**Pros:**

- ✅ Simple API
- ✅ Pattern matching for routes

**Cons:**

- ❌ Maintenance concerns (less active)
- ❌ Better alternatives exist now
- ❌ No official Flutter backing

**Why not chosen:** Superseded by GoRouter and Navigator 2.0.

---

## Rationale

**Why imperative Navigator + guards:**

1. **Simplicity First (KISS)**
   - Flutter's built-in Navigator is well-understood
   - No additional dependencies
   - Clear, readable code
   - Easy onboarding for new developers

2. **Sufficient for Current Needs**
   - ~10-15 routes in the app
   - Simple auth/role-based guards
   - No complex nested navigation yet

3. **Guards Are Explicit**

   ```dart
   // Clear what this route requires
   adminPanel: (context) => _guardRoute(
     context,
     AdminPanelScreen(),
     requiresAuth: true,
     requiresRole: 'admin',
   )
   ```

4. **Easy Testing**
   - Navigation logic is isolated
   - Guards can be unit tested independently
   - No framework magic to mock

5. **Maintainability**
   - All routes in one file (`core/routes.dart`)
   - Guard logic centralized
   - Easy to modify or extend

---

## Consequences

### Positive ✅

1. **Zero External Dependencies**
   - No package updates to track
   - No breaking changes from third-party libs

2. **Simple Mental Model**
   - Traditional navigation patterns
   - No advanced routing concepts needed

3. **Fast Development**
   - No code generation delays
   - No complex router setup

4. **Easy Debugging**
   - Standard Flutter debugging tools work
   - Clear navigation stack inspection

### Negative ❌

1. **Manual Route Management**
   - No type-safe parameters (use maps)
   - Routes are string constants (typo risk)
   - No compile-time route validation

2. **Limited Deep Linking**
   - Web URLs require manual parsing
   - No automatic URL generation

3. **Guard Boilerplate**
   - Each guarded route needs wrapper
   - Repetitive `_guardRoute` calls

### Neutral ⚖️

1. **Migration Path Available**
   - Can migrate to GoRouter later if needed
   - Route constants are compatible
   - Guards can be adapted to GoRouter redirects

---

## Validation

**Metrics:**

- ✅ **15 routes** defined in `core/routes.dart`
- ✅ **3 guard types**: auth, role, both
- ✅ **100% coverage** of navigation guards (unit tests)
- ✅ **13 E2E tests** validate navigation flows
- ✅ **0 navigation-related bugs** in production

**Example test:**

```dart
test('dashboard route requires authentication', () {
  final route = AppRoutes.getRoutes(context)[AppRoutes.dashboard];

  // Mock unauthenticated state
  when(mockAuthProvider.isAuthenticated).thenReturn(false);

  final widget = route!(context);

  // Should show loading, then redirect to login
  expect(widget, isA<LoadingScreen>());
  verify(mockNavigator.pushReplacementNamed(AppRoutes.login));
});
```

**Navigation patterns tested:**

1. ✅ Public routes (accessible without auth)
2. ✅ Protected routes (require authentication)
3. ✅ Role-restricted routes (require specific role)
4. ✅ Unauthorized access handling
5. ✅ Login redirect flow

---

## Migration Considerations

**If we need GoRouter later:**

```dart
// Current approach maps easily to GoRouter
final router = GoRouter(
  routes: [
    // Current: Navigator.pushNamed(context, AppRoutes.dashboard)
    // Future:  context.go('/dashboard')
    GoRoute(
      path: AppRoutes.dashboard, // Same constant
      builder: (context, state) => DashboardScreen(),
      redirect: (context, state) => _authGuard(context, state),
    ),
  ],
);
```

**Trigger points for migration:**

- App exceeds 30+ routes (current: 15)
- Need advanced nested navigation
- Web becomes primary platform (deep linking critical)
- Team requests type-safe routing

**Effort estimate:** 1-2 days for full GoRouter migration (if needed).

---

## References

- [Flutter Navigation & Routing](https://docs.flutter.dev/development/ui/navigation)
- [GoRouter Package](https://pub.dev/packages/go_router)
- [Navigator 2.0 Documentation](https://docs.flutter.dev/development/ui/navigation/deep-linking)
- Internal: `frontend/lib/core/routes.dart` (implementation)
- Internal: `frontend/test/core/routes_test.dart` (validation tests)
