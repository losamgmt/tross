# TrossApp Frontend

**Flutter web/mobile application for work order management**

[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev/)

---

## 🎯 Overview

Cross-platform frontend for TrossApp built with Flutter, featuring:

- **Material 3 Design System** with custom TrossApp branding
- **Atomic Design Pattern** (atoms → molecules → organisms → screens)
- **Provider State Management** with defensive error handling
- **Auth0 Integration** supporting web, iOS, and Android
- **Type-Safe API Client** with auto token refresh
- **Comprehensive Test Coverage** across all layers

---

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Login    │  │    Home    │  │   Admin    │  Screens   │
│  │  Screen    │  │   Screen   │  │ Dashboard  │            │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘            │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│         ┌────────────────▼────────────────┐                  │
│         │   Organisms (Data Tables,       │  Atomic         │
│         │   Headers, Error Displays)      │  Design         │
│         └────────────────┬────────────────┘                  │
│                          │                                   │
│         ┌────────────────▼────────────────┐                  │
│         │   Molecules (Cards, Search,     │                  │
│         │   Pagination, Toolbars)         │                  │
│         └────────────────┬────────────────┘                  │
│                          │                                   │
│         ┌────────────────▼────────────────┐                  │
│         │   Atoms (Buttons, Icons,        │                  │
│         │   Typography, Badges)           │                  │
│         └────────────────┬────────────────┘                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
        ┌──────────────────▼──────────────────┐
        │       State Management Layer        │
        │  ┌──────────────┐  ┌─────────────┐ │
        │  │    Auth      │  │     App     │ │  Provider
        │  │   Provider   │  │   Provider  │ │  Pattern
        │  └──────┬───────┘  └──────┬──────┘ │
        └─────────┼──────────────────┼────────┘
                  │                  │
        ┌─────────▼──────────────────▼────────┐
        │         Service Layer               │
        │  ┌──────────┐  ┌──────────────┐    │
        │  │   Auth   │  │ User/Role    │    │  HTTP
        │  │ Service  │  │  Services    │    │  Requests
        │  └────┬─────┘  └──────┬───────┘    │
        │       │               │             │
        │       │    ┌──────────▼──────────┐ │
        │       │    │    API Client       │ │
        │       │    │  (Token Refresh)    │ │
        │       │    └──────────┬──────────┘ │
        └───────┼───────────────┼────────────┘
                │               │
        ┌───────▼───────────────▼────────────┐
        │      Backend API (Node.js)         │
        │    http://localhost:3001/api       │
        └────────────────────────────────────┘
```

### Directory Structure

```
frontend/lib/
├── config/              # Theme, colors, spacing, constants
├── core/                # Routing, navigation guards
├── models/              # Data models with defensive validation
├── providers/           # State management (AuthProvider, AppProvider)
├── screens/             # Page-level widgets
├── services/            # API client, auth, user/role services
├── utils/               # Validators, form helpers
└── widgets/
    ├── atoms/           # Buttons, icons, typography
    ├── molecules/       # Cards, search bars, table components
    ├── organisms/       # Data tables, headers, error displays
    └── helpers/         # AsyncDataWidget, etc.
```

### Data Flow Example

```
User Login → LoginScreen → AuthProvider.login()
           → AuthService.loginWithAuth0()
           → ApiClient.post('/api/auth/login')
           → Backend validates → Returns JWT
           → TokenManager.saveToken()
           → AuthProvider.notifyListeners()
           → UI rebuilds → Navigate to Home
```

**Key Design Decisions:**

- See `docs/architecture/decisions/` for all ADRs
- See `docs/auth/FLUTTER_AUTH_ARCHITECTURE.md` for auth implementation
- KISS principle throughout - minimal abstraction, maximum clarity
- Defensive validation at every data boundary (API, JSON, user input)

---

## 📋 Prerequisites

- **Flutter SDK**: 3.35.5 or higher
- **Dart**: 3.x (comes with Flutter)
- **Node.js**: 18+ (for running backend)
- **IDE**: VS Code (recommended) or Android Studio

### VS Code Extensions (Recommended)

- Flutter
- Dart
- Coverage Gutters (for viewing test coverage)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
flutter pub get
```

### 2. Run Development Server

```bash
# From project root
npm run dev:frontend

# Or directly from frontend/
flutter run -d chrome
```

### 3. Run Tests

```bash
# All tests
flutter test

# With coverage
flutter test --coverage

# Specific test file
flutter test test/providers/auth_provider_test.dart
```

### 4. Build for Production

```bash
# Web
flutter build web --release

# Android APK
flutter build apk --release

# iOS (requires macOS)
flutter build ios --release
```

---

## 🧪 Testing

```bash
# Run all tests
flutter test --reporter=compact

# Run with coverage visualization
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html

# Run specific test suites
flutter test test/providers/          # State management tests
flutter test test/services/           # API client tests
flutter test test/widgets/            # Widget tests
flutter test test/e2e/                # End-to-end tests
```

**Testing Philosophy:**

- Comprehensive coverage across all layers
- Providers: State management and defensive error handling
- Services: API client functionality and auth flows
- Models: Defensive validation patterns
- E2E: Complete user journey validation
- Concurrency: Multi-operation stress testing

View detailed coverage: `frontend/coverage/COVERAGE_ANALYSIS.md`

**CI/CD:** See [CI_CD.md](../docs/CI_CD.md#-frontend-cicd) for automated testing pipeline and GitHub Actions workflow.

---

## 🔧 Configuration

### Environment Setup

**Development (default):**

- Backend: `http://localhost:3001`
- Uses dev auth tokens from backend
- Hot reload enabled

**Production:**

```dart
// lib/config/app_config.dart
static const String environment = 'production';
static const String baseUrl = 'https://api.trossapp.com';
```

### Auth0 Configuration

For production Auth0:

1. Set up Auth0 application at https://auth0.com
2. Configure callback URLs
3. Update `lib/config/auth0_config.dart`:

```dart
static const String domain = 'your-tenant.auth0.com';
static const String clientId = 'your-client-id';
```

See `docs/AUTH0_INTEGRATION.md` for full setup.

---

## 📦 Project Structure

**State Management:**

- `providers/auth_provider.dart` - Authentication state
- `providers/app_provider.dart` - App-wide state (theme, etc.)

**API Layer:**

- `services/api_client.dart` - HTTP client with auto token refresh
- `services/user_service.dart` - User CRUD operations
- `services/role_service.dart` - Role management
- `services/auth/` - Auth0 platform services (web, iOS, Android)

**Models:**

- `models/user_model.dart` - User entity with defensive validation
- `models/role_model.dart` - Role entity with defensive validation
- All models include `fromJson()` with `Validators.toSafe*()` functions

**Widgets:**

- Atomic design: `atoms/` → `molecules/` → `organisms/`
- Reusable `AppDataTable<T>` for type-safe data grids
- Consistent error handling with `ErrorDisplay` widget

---

## 🐛 Troubleshooting

### "Failed to connect to backend"

- Ensure backend is running: `npm run dev:backend`
- Check `lib/config/app_config.dart` has correct `baseUrl`
- Verify CORS settings in `backend/server.js`

### "Auth0 redirect not working"

- Check Auth0 callback URLs match exactly
- For web: Must use `http://localhost:5000/auth/callback`
- Clear browser cache and try again

### Tests failing

```bash
# Clean and retry
flutter clean
flutter pub get
flutter test
```

### Coverage not generating

```bash
# Ensure lcov is installed
flutter test --coverage
# Check frontend/coverage/lcov.info was created
```

---

## 📚 Additional Documentation

- **Main README:** `../README.md` - Project overview
- **API Docs:** `../docs/api/README.md` - Backend endpoints
- **Auth Guide:** `../docs/AUTH0_INTEGRATION.md`
- **Deployment:** `../docs/DEPLOYMENT.md`
- **Architecture:** `../docs/auth/FLUTTER_AUTH_ARCHITECTURE.md`
- **Testing Strategy:** `frontend/coverage/COVERAGE_ANALYSIS.md`

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Write tests first (TDD approach)
3. Run tests: `flutter test`
4. Run analyzer: `flutter analyze`
5. Format code: `dart format .`
6. Commit with clear message
7. Push and create PR

**Code Standards:**

- KISS principle - keep it simple
- SRP - single responsibility per file/class
- Defensive validation - never trust external data
- Document public APIs with `///` comments
- Test coverage required for new features

---

## 📄 License

MIT - See `../LICENSE` for details
