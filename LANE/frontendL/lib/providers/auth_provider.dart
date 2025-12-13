import 'package:flutter/foundation.dart';
import '../services/auth/auth_service.dart';
import '../services/error_service.dart';
import '../services/auth/auth0_platform_service.dart';
import '../services/permission_service_dynamic.dart';
import '../models/permission.dart';

/// Authentication State Provider
///
/// Manages authentication state across the entire application using Flutter's
/// ChangeNotifier pattern. This provider is the single source of truth for
/// authentication status, user data, and permission checks.
///
/// **Architecture:**
/// - Extends ChangeNotifier for reactive state management
/// - Delegates business logic to AuthService (singleton)
/// - Permission checks delegate to PermissionService (pure functions)
/// - Error handling via ErrorService for user-friendly messages
///
/// **State Management Pattern:**
/// - All state changes trigger `notifyListeners()` to update UI
/// - Private setters ensure state mutations are controlled
/// - Loading states prevent UI race conditions
/// - Error states provide user feedback
///
/// **Usage Example:**
/// ```dart
/// // In widget tree root (main.dart):
/// ChangeNotifierProvider(create: (_) => AuthProvider())
///
/// // In widgets:
/// Consumer<AuthProvider>(
///   builder: (context, auth, _) {
///     if (auth.isAuthenticated) {
///       return HomeScreen();
///     }
///     return LoginScreen();
///   }
/// )
///
/// // Or with Provider.of:
/// final auth = Provider.of<AuthProvider>(context);
/// if (auth.hasPermission('users', 'read')) {
///   // Show users list
/// }
/// ```
///
/// **Key Features:**
/// - Production login via Auth0 (web/iOS/Android)
/// - Dev mode login with test tokens (5 roles)
/// - Permission checks with detailed denial reasons
/// - Role-based access control
/// - Profile updates with backend sync
/// - Persistent session (local storage)
///
/// **KISS Principle:**
/// - Simple state properties (no complex streams/subscriptions)
/// - Explicit notifyListeners() calls (predictable updates)
/// - No dispose() needed (no resources to clean up)
/// - Direct delegation to services (thin provider layer)
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  // State properties
  bool _isLoading = false;
  bool _isRedirecting = false; // Track Auth0 redirect in progress
  String? _error;
  Map<String, dynamic>? _user;
  bool _isAuthenticated = false;

  // Public getters for reactive state access

  /// Whether an authentication operation is in progress
  /// Used to show loading indicators and prevent duplicate operations
  bool get isLoading => _isLoading;

  /// Whether Auth0 redirect is in progress (web-only)
  /// Prevents navigation during OAuth flow
  bool get isRedirecting => _isRedirecting;

  /// Current error message, or null if no error
  /// Cleared automatically when new operations start
  String? get error => _error;

  /// Current authenticated user data, or null if not authenticated
  /// Contains: id, email, name, role, permissions, etc.
  Map<String, dynamic>? get user => _user;

  /// Whether user is currently authenticated
  /// This is the primary gate for protected routes and features
  bool get isAuthenticated => _isAuthenticated;

  /// JWT access token for API requests, or null if not authenticated
  /// Managed by AuthService, used by ApiClient
  String? get token => _authService.token;

  // User convenience getters with safe defaults

  /// Display name for current user, defaults to 'User' if not authenticated
  String get userName =>
      _user != null ? (_user!['name'] as String? ?? 'User') : 'User';

  /// Role of current user, defaults to 'unknown' if not authenticated
  /// Possible values: admin, manager, technician, viewer, unknown
  String get userRole =>
      _user != null ? (_user!['role'] as String? ?? 'unknown') : 'unknown';

  /// Email of current user, defaults to empty string if not authenticated
  String get userEmail =>
      _user != null ? (_user!['email'] as String? ?? '') : '';

  /// Unique ID of current user, or null if not authenticated
  int? get userId => _user?['id'] as int?;

  /// Whether current user account is active
  /// Inactive users are automatically logged out
  bool get isActive => _user?['is_active'] == true;

  /// Initialize auth state from local storage
  ///
  /// Attempts to restore previous session without making HTTP requests.
  /// This is called once at app startup in AuthWrapper.
  ///
  /// **KISS Design:**
  /// - No HTTP calls (fast startup)
  /// - Only restores from local storage
  /// - Backend validates token on first API request
  /// - Gracefully handles missing/invalid stored data
  ///
  /// **Side Effects:**
  /// - Sets isLoading = true → false
  /// - Updates isAuthenticated, user, error states
  /// - Triggers notifyListeners() on completion
  ///
  /// **Example:**
  /// ```dart
  /// await authProvider.initialize(); // Called in AuthWrapper.initState()
  /// ```
  Future<void> initialize() async {
    _setLoading(true);
    _clearError();

    try {
      // Initialize the AuthService (restores stored auth state from local storage only)
      await _authService.initialize();

      // Check if already authenticated based on stored data
      if (_authService.isAuthenticated) {
        _user = _authService.user;
        _isAuthenticated = true;
        ErrorService.logInfo('Auth state initialized - user logged in');
      } else {
        ErrorService.logInfo('Auth state initialized - no active session');
      }
    } catch (e) {
      _setError('Failed to initialize authentication');
      ErrorService.logError('Auth initialization failed', error: e);
    } finally {
      _setLoading(false);
    }
  }

  /// Production login via Auth0
  ///
  /// Triggers OAuth flow for web, iOS, or Android platforms.
  /// Redirects user to Auth0 login page, then handles callback.
  ///
  /// **Platform Behavior:**
  /// - **Web**: Redirects to Auth0, returns to /callback route
  /// - **iOS/Android**: Opens Auth0 in secure browser, handles deep link
  ///
  /// **Flow:**
  /// 1. Sets isRedirecting = true (prevents navigation)
  /// 2. Calls Auth0PlatformService to start OAuth
  /// 3. User completes login on Auth0
  /// 4. App receives callback (handled by handleAuth0Callback)
  /// 5. Token exchanged for user data
  /// 6. State updated, notifyListeners() triggers UI update
  ///
  /// **Error Handling:**
  /// - Network errors: User-friendly message via ErrorService
  /// - Auth0 errors: Captured and displayed
  /// - Automatic redirect state reset on error
  ///
  /// **Example:**
  /// ```dart
  /// await authProvider.loginWithAuth0();
  /// // User redirected to Auth0...
  /// // After callback: authProvider.isAuthenticated == true
  /// ```
  ///
  /// Returns true if login initiated successfully, false on immediate error
  Future<bool> loginWithAuth0() async {
    _setLoading(true);
    _clearError();

    // On web, mark as redirecting to prevent dashboard flash
    if (Auth0PlatformService.isWeb) {
      _isRedirecting = true;
      notifyListeners();
    }

    try {
      final success = await _authService.loginWithAuth0();

      if (success) {
        _user = _authService.user;
        _isAuthenticated = true;
        ErrorService.logInfo(
          'Auth0 login successful',
          context: {'role': _user?['role'], 'email': _user?['email']},
        );
        notifyListeners();
        return true;
      } else {
        _setError('Auth0 login failed. Please try again.');
        return false;
      }
    } catch (e) {
      _setError('Login error: ${ErrorService.getUserFriendlyMessage(e)}');
      ErrorService.logError('Auth0 login failed', error: e);
      return false;
    } finally {
      _setLoading(false);
      // Don't clear redirecting flag - browser is navigating away
    }
  }

  /// Handle Auth0 callback after OAuth redirect (web-only)
  ///
  /// Processes the OAuth callback when user returns from Auth0.
  /// Called by Auth0CallbackHandler on the /callback route.
  ///
  /// **Web Flow:**
  /// 1. User clicks login → redirected to Auth0
  /// 2. User completes Auth0 login
  /// 3. Auth0 redirects back to /callback?code=...
  /// 4. This method exchanges code for tokens
  /// 5. Fetches user profile from Auth0
  /// 6. Updates state, navigates to dashboard
  ///
  /// **Side Effects:**
  /// - Clears isRedirecting flag
  /// - Sets isLoading during token exchange
  /// - Updates user and isAuthenticated on success
  /// - Triggers notifyListeners() for UI update
  ///
  /// **Error Handling:**
  /// - Invalid code: Error message displayed
  /// - Network failure: Graceful fallback
  /// - Token exchange errors: Logged and reported
  ///
  /// Returns true if callback handled successfully, false on error
  Future<bool> handleAuth0Callback() async {
    _setLoading(true);
    _clearError();
    _isRedirecting = false; // Clear redirect flag when callback starts

    try {
      final success = await _authService.handleAuth0Callback();

      if (success) {
        _user = _authService.user;
        _isAuthenticated = true;
        ErrorService.logInfo(
          'Auth0 callback handled successfully',
          context: {'role': _user?['role'], 'email': _user?['email']},
        );
        notifyListeners();
        return true;
      } else {
        _setError('Auth0 login failed during callback.');
        return false;
      }
    } catch (e) {
      _setError('Callback error: ${ErrorService.getUserFriendlyMessage(e)}');
      ErrorService.logError('Auth0 callback failed', error: e);
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Development login with test token
  ///
  /// Bypasses Auth0 for local development. Generates test JWT tokens
  /// for any role without requiring Auth0 configuration.
  ///
  /// **Supported Roles:**
  /// - `admin` - Full system access
  /// - `manager` - Management operations
  /// - `dispatcher` - Dispatch operations
  /// - `technician` - Field technician access
  /// - `client` - Client/customer access
  ///
  /// **Security:**
  /// - Only works with development backend (NODE_ENV=development)
  /// - Production backend rejects test tokens
  /// - Test tokens have recognizable pattern for easy identification
  ///
  /// **Usage:**
  /// ```dart
  /// await authProvider.loginWithTestToken(role: 'admin');
  /// // Now authenticated as admin with full permissions
  /// ```
  ///
  /// **Example Use Cases:**
  /// - Testing permission-gated features
  /// - E2E tests with different roles
  /// - Local development without Auth0 setup
  ///
  /// Returns true if login successful, false on error
  Future<bool> loginWithTestToken({required String role}) async {
    _setLoading(true);
    _clearError();

    try {
      ErrorService.logInfo('Starting dev token login', context: {'role': role});

      final success = await _authService.loginWithTestToken(role: role);

      ErrorService.logInfo(
        'Dev token login result',
        context: {'success': success},
      );

      if (success) {
        _user = _authService.user;
        _isAuthenticated = true;

        ErrorService.logInfo(
          'Dev token login SUCCESS - updating state',
          context: {
            'requestedRole': role,
            'actualRole': _user?['role'],
            'isAuthenticated': _isAuthenticated,
            'hasUser': _user != null,
          },
        );

        notifyListeners();
        return true;
      } else {
        ErrorService.logError(
          'Dev token login FAILED',
          error: 'success = false',
        );
        _setError('Login failed. Please try again.');
        return false;
      }
    } catch (e) {
      ErrorService.logError('Login error exception', error: e);
      _setError('Login error: ${ErrorService.getUserFriendlyMessage(e)}');
      ErrorService.logError('Test login failed', error: e);
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Update user profile information
  ///
  /// Sends profile updates to backend and refreshes local user state.
  /// Only updates provided fields, other fields remain unchanged.
  ///
  /// **Updatable Fields:**
  /// - `name` - Display name
  /// - `email` - Email address (may require verification)
  /// - `phone` - Phone number
  /// - Custom profile fields as supported by backend
  ///
  /// **Validation:**
  /// - Backend validates all updates
  /// - Invalid data returns error without changing state
  /// - Auth token must be valid
  ///
  /// **Side Effects:**
  /// - Updates local _user object
  /// - Triggers notifyListeners() on success
  /// - Persists changes to local storage
  ///
  /// **Example:**
  /// ```dart
  /// final success = await authProvider.updateProfile({
  ///   'name': 'John Doe',
  ///   'phone': '+1234567890',
  /// });
  /// if (success) {
  ///   // Profile updated, UI will rebuild
  /// }
  /// ```
  ///
  /// Returns true if update successful, false on error
  Future<bool> updateProfile(Map<String, dynamic> updates) async {
    _setLoading(true);
    _clearError();

    try {
      final success = await _authService.updateProfile(updates);

      if (success) {
        _user = _authService.user;
        ErrorService.logInfo('Profile updated successfully');
        notifyListeners();
        return true;
      } else {
        _setError('Failed to update profile');
        return false;
      }
    } catch (e) {
      _setError('Update error: ${ErrorService.getUserFriendlyMessage(e)}');
      ErrorService.logError('Profile update failed', error: e);
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Logout user and clear authentication state
  ///
  /// Clears all local auth state and triggers global redirect to login.
  /// Behavior differs between Auth0 and dev mode authentication.
  ///
  /// **Auth0 Logout (Production/Web):**
  /// 1. Clears local state immediately
  /// 2. notifyListeners() triggers AuthStateListener
  /// 3. AuthStateListener redirects to login page
  /// 4. Auth0PlatformService redirects browser to Auth0 logout
  /// 5. Auth0 clears session, redirects back to app login
  ///
  /// **Dev Mode Logout:**
  /// 1. Clears local state
  /// 2. Clears local storage
  /// 3. Triggers AuthStateListener redirect
  /// 4. User returned to login screen
  ///
  /// **KISS Design:**
  /// - Clears state BEFORE async operations (immediate UI feedback)
  /// - No loading state (logout is instant from UI perspective)
  /// - AuthStateListener handles global redirect
  /// - Cleanup happens asynchronously after state cleared
  ///
  /// **Side Effects:**
  /// - Sets isAuthenticated = false
  /// - Clears user, token, error states
  /// - Triggers notifyListeners() → AuthStateListener redirect
  /// - Calls AuthService.logout() for cleanup
  ///
  /// **Example:**
  /// ```dart
  /// await authProvider.logout();
  /// // User immediately redirected to login
  /// ```
  Future<void> logout() async {
    _clearError();

    try {
      // Clear all auth state flags to trigger AuthStateListener redirect
      _user = null;
      _isAuthenticated = false;
      _isLoading = false; // Ensure loading is false
      _isRedirecting = false; // Ensure redirecting is false
      notifyListeners(); // Trigger AuthStateListener

      await _authService.logout();
    } catch (e) {
      ErrorService.logError('Logout error', error: e);
    }
  }

  /// Check if user has specific role
  bool hasRole(String roleName) {
    return _authService.hasRole(roleName);
  }

  // ============================================================================
  // PERMISSION METHODS (Triple-Tier Security - Frontend Layer)
  // ============================================================================
  //
  // These methods provide the frontend layer of TrossApp's triple-tier security:
  // 1. Frontend (these methods) - UI gating, immediate feedback
  // 2. Backend API - Token validation, authorization checks
  // 3. Database - Row-level security, data access control
  //
  // All permission checks delegate to PermissionService (pure functions).

  /// Check if user has permission for operation on resource
  ///
  /// Primary method for permission-gated UI elements like buttons,
  /// menu items, or feature access.
  ///
  /// **Usage Examples:**
  /// ```dart
  /// // Show delete button only if user can delete
  /// if (authProvider.hasPermission(ResourceType.users, CrudOperation.delete)) {
  ///   IconButton(icon: Icon(Icons.delete), ...)
  /// }
  ///
  /// // Enable export feature for users with read permission
  /// if (authProvider.hasPermission(ResourceType.audits, CrudOperation.read)) {
  ///   ElevatedButton(onPressed: exportAudits, ...)
  /// }
  /// ```
  ///
  /// **Parameters:**
  /// - `resource` - What is being accessed (users, roles, routes, audits, etc.)
  /// - `operation` - What action (create, read, update, delete)
  ///
  /// **Returns:**
  /// - `true` if user has permission
  /// - `false` if denied, not authenticated, or account inactive
  ///
  /// **Note:** This is frontend validation only. Backend must validate again.
  bool hasPermission(ResourceType resource, CrudOperation operation) {
    // Must be authenticated with active account
    if (!_isAuthenticated || !isActive) {
      return false;
    }

    return PermissionService.hasPermission(userRole, resource, operation);
  }

  /// Get detailed permission check with denial reason
  ///
  /// Returns `PermissionResult` with `allowed` boolean and `denialReason`.
  /// Use this when you need to explain WHY access was denied.
  ///
  /// **Usage Examples:**
  /// ```dart
  /// // Show error message explaining why action is blocked
  /// final result = authProvider.checkPermission(
  ///   ResourceType.users,
  ///   CrudOperation.delete
  /// );
  /// if (!result.allowed) {
  ///   ScaffoldMessenger.of(context).showSnackBar(
  ///     SnackBar(content: Text(result.denialReason))
  ///   );
  /// }
  ///
  /// // Conditional rendering with explanation
  /// final canExport = authProvider.checkPermission(
  ///   ResourceType.audits,
  ///   CrudOperation.read
  /// );
  /// if (canExport.allowed) {
  ///   return ExportButton();
  /// } else {
  ///   return Tooltip(
  ///     message: canExport.denialReason,
  ///     child: Icon(Icons.lock),
  ///   );
  /// }
  /// ```
  ///
  /// **Denial Reasons Include:**
  /// - "User not authenticated"
  /// - "User account is deactivated"
  /// - "Role 'technician' does not have 'delete' permission for 'users'"
  ///
  /// Returns `PermissionResult` with allowed status and reason
  PermissionResult checkPermission(
    ResourceType resource,
    CrudOperation operation,
  ) {
    if (!_isAuthenticated) {
      return const PermissionResult.denied(
        denialReason: 'User not authenticated',
      );
    }

    if (!isActive) {
      return const PermissionResult.denied(
        denialReason: 'User account is deactivated',
      );
    }

    return PermissionService.checkPermission(userRole, resource, operation);
  }

  /// Check if user has minimum role level
  ///
  /// Roles are hierarchical: admin > manager > dispatcher > technician > client
  /// A manager has "minimum role" of technician (but not vice versa).
  ///
  /// **Usage Examples:**
  /// ```dart
  /// // Restrict feature to managers and above
  /// if (authProvider.hasMinimumRole('manager')) {
  ///   return ManagerDashboard();
  /// }
  ///
  /// // Admin-only section
  /// if (authProvider.hasMinimumRole('admin')) {
  ///   return SystemSettings();
  /// }
  /// ```
  ///
  /// **Role Hierarchy:**
  /// - `admin` - Highest level, has all permissions
  /// - `manager` - Can manage operations, has minimum roles below
  /// - `dispatcher` - Can dispatch, has technician/client permissions
  /// - `technician` - Field access, has client permissions
  /// - `client` - Lowest level, basic access
  ///
  /// **Parameters:**
  /// - `requiredRole` - String role name (case-insensitive)
  ///
  /// **Returns:**
  /// - `true` if user's role >= required role
  /// - `false` if insufficient role, not authenticated, or inactive
  bool hasMinimumRole(String requiredRole) {
    if (!_isAuthenticated || !isActive) {
      return false;
    }

    final requiredRoleEnum = UserRole.fromString(requiredRole);
    if (requiredRoleEnum == null) {
      return false; // Unknown required role
    }

    return PermissionService.hasMinimumRole(userRole, requiredRoleEnum);
  }

  /// Get all CRUD operations user can perform on resource
  ///
  /// Returns list of operations (create, read, update, delete) that
  /// are allowed for the resource. Useful for dynamically building UI.
  ///
  /// **Usage Examples:**
  /// ```dart
  /// // Build action menu with only allowed operations
  /// final operations = authProvider.getAllowedOperations(ResourceType.users);
  /// return PopupMenuButton(
  ///   itemBuilder: (context) => [
  ///     if (operations.contains(CrudOperation.read))
  ///       PopupMenuItem(child: Text('View')),
  ///     if (operations.contains(CrudOperation.update))
  ///       PopupMenuItem(child: Text('Edit')),
  ///     if (operations.contains(CrudOperation.delete))
  ///       PopupMenuItem(child: Text('Delete')),
  ///   ],
  /// );
  ///
  /// // Check if user has any write access
  /// final writeOps = [CrudOperation.create, CrudOperation.update, CrudOperation.delete];
  /// final canWrite = authProvider.getAllowedOperations(ResourceType.audits)
  ///   .any((op) => writeOps.contains(op));
  /// ```
  ///
  /// **Returns:**
  /// - List of CrudOperation enums user can perform
  /// - Empty list if not authenticated or inactive
  ///
  /// **Example Return Values:**
  /// - Admin on users: [create, read, update, delete]
  /// - Technician on audits: [read]
  /// - Client on routes: []
  List<CrudOperation> getAllowedOperations(ResourceType resource) {
    if (!_isAuthenticated || !isActive) {
      return [];
    }

    return PermissionService.getAllowedOperations(userRole, resource);
  }

  /// Check if user can access resource with any operation
  ///
  /// Returns true if user has at least one permission (create, read, update, delete)
  /// for the resource. Commonly used for route guards and screen visibility.
  ///
  /// **Usage Examples:**
  /// ```dart
  /// // Route guard in onGenerateRoute
  /// if (routeName == '/users' && !authProvider.canAccessResource(ResourceType.users)) {
  ///   return MaterialPageRoute(builder: (_) => UnauthorizedScreen());
  /// }
  ///
  /// // Conditional menu item
  /// if (authProvider.canAccessResource(ResourceType.roles)) {
  ///   MenuItem(
  ///     title: 'Role Management',
  ///     onTap: () => Navigator.pushNamed(context, '/roles'),
  ///   )
  /// }
  ///
  /// // Hide entire section
  /// if (authProvider.canAccessResource(ResourceType.audits)) {
  ///   return AuditLogSection();
  /// }
  /// return SizedBox.shrink(); // Hidden
  /// ```
  ///
  /// **Note:** This checks for ANY access. Use `hasPermission()` for specific
  /// operations like delete or update.
  ///
  /// **Returns:**
  /// - `true` if user has at least one operation allowed
  /// - `false` if no access, not authenticated, or inactive
  bool canAccessResource(ResourceType resource) {
    if (!_isAuthenticated || !isActive) {
      return false;
    }

    return PermissionService.canAccessResource(userRole, resource);
  }

  /// Clear any error messages
  ///
  /// Clears the current error state and triggers UI update.
  /// Useful for dismissing error messages or resetting before retry.
  void clearError() {
    _clearError();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - State Management Utilities
  // ============================================================================
  //
  // These methods ensure all state changes trigger notifyListeners() for
  // reactive UI updates. They encapsulate the state mutation pattern.

  /// Set loading state and notify listeners
  ///
  /// Called at start/end of async operations to show loading indicators.
  /// Always triggers notifyListeners() to update UI immediately.
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  /// Set error message and notify listeners
  ///
  /// Stores user-friendly error message and triggers UI update.
  /// Error messages should be processed through ErrorService first.
  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  /// Clear error message if one exists
  ///
  /// Only triggers notifyListeners() if error was actually cleared.
  /// Called at start of operations to reset error state.
  void _clearError() {
    if (_error != null) {
      _error = null;
      notifyListeners();
    }
  }
}
