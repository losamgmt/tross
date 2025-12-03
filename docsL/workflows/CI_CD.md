# GitHub Actions CI/CD

Simple, professional continuous integration and deployment pipeline for TrossApp.

## Overview

Our CI/CD pipeline follows the **KISS principle** - it's clean, clear, and comprehensive without over-engineering.

---

## 🔧 Backend CI/CD

**Triggers:** Push or PR to `main` or `develop` branches

### Jobs

1. **Test** - Run all backend tests
   - Unit tests (fast, mocked)
   - Integration tests (real PostgreSQL)
   - Coverage reporting to Codecov

2. **Lint** - Code quality checks
   - Format validation with Prettier

3. **Build** - Verify build artifacts
   - Backend build verification
   - Ready for deployment

### Test Database

Uses PostgreSQL 15 service container:

- Port: 5434
- Database: trossapp_test
- User: test_user
- Health checks enabled

Migrations run automatically before integration tests.

---

## 🎨 Frontend CI/CD

**Status:** Ready for implementation (template below)

### Recommended Workflow

```yaml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths:
      - "frontend/**"
      - ".github/workflows/frontend.yml"
  pull_request:
    branches: [main, develop]
    paths:
      - "frontend/**"

jobs:
  test:
    name: Flutter Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.35.6"
          channel: "stable"

      - name: Install dependencies
        working-directory: ./frontend
        run: flutter pub get

      - name: Verify formatting
        working-directory: ./frontend
        run: dart format --output=none --set-exit-if-changed .

      - name: Analyze code
        working-directory: ./frontend
        run: flutter analyze --fatal-infos

      - name: Run tests
        working-directory: ./frontend
        run: flutter test --coverage --reporter=expanded

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          name: flutter-coverage

  build-web:
    name: Build Web
    runs-on: ubuntu-latest
    needs: test

    steps:
      - uses: actions/checkout@v3

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.35.6"
          channel: "stable"

      - name: Install dependencies
        working-directory: ./frontend
        run: flutter pub get

      - name: Build web
        working-directory: ./frontend
        run: flutter build web --release

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: frontend/build/web/

  build-android:
    name: Build Android APK (Optional)
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: "zulu"
          java-version: "17"

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.35.6"

      - name: Install dependencies
        working-directory: ./frontend
        run: flutter pub get

      - name: Build APK
        working-directory: ./frontend
        run: flutter build apk --release

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: android-apk
          path: frontend/build/app/outputs/flutter-apk/app-release.apk
```

### Local Testing (What CI Runs)

```bash
cd frontend

# 1. Verify formatting
dart format --output=none --set-exit-if-changed .

# 2. Analyze code
flutter analyze --fatal-infos

# 3. Run all tests
flutter test --coverage

# 4. Build for web
flutter build web --release

# 5. Build for Android (optional)
flutter build apk --release
```

### Key Features

✅ **Fast feedback** - Tests run in ~15 seconds  
✅ **Coverage tracking** - Uploads to Codecov automatically  
✅ **Multi-platform** - Web build on every commit, Android on main  
✅ **Format enforcement** - Auto-fail on bad formatting  
✅ **Static analysis** - Flutter analyzer with strict mode  
✅ **Build verification** - Ensures production builds succeed

### Why Not Enabled Yet?

**Waiting on:**

- Mobile signing certificates (Android keystore, iOS provisioning)
- Codecov token for frontend coverage
- Decision on web deployment target (Firebase, Netlify, etc.)

**To enable:** Create `.github/workflows/frontend.yml` with the template above.

---

## 🔄 Running Locally

### Backend

```bash
# Run what CI runs
npm run test:unit
npm run test:integration
npm run format:check

# Or all at once
npm run test:all
```

### Frontend

```bash
cd frontend

# Format, analyze, test
dart format .
flutter analyze
flutter test

# Build verification
flutter build web --release
```

---

## 📊 Key Metrics

**Backend:**

- ✅ Comprehensive test suite (unit + integration)
- ✅ Code coverage tracking enabled
- ✅ All integration tests use real PostgreSQL

**Frontend:**

- ✅ Comprehensive test suite across all layers
- ✅ Coverage analysis available
- ✅ Fast test execution

---

## 🚀 Future Enhancements

When needed (not now):

- E2E tests with Playwright (web + Flutter)
- Automated deployment to staging/production
- Docker image building for frontend
- Performance benchmarks
- Visual regression testing

---

## 📛 Badges

Add to README.md:

```markdown
![Backend CI](https://github.com/losamgmt/tross-app/workflows/CI%2FCD/badge.svg)
![Frontend CI](https://github.com/losamgmt/tross-app/workflows/Frontend%20CI/badge.svg)
[![codecov](https://codecov.io/gh/losamgmt/tross-app/branch/main/graph/badge.svg)](https://codecov.io/gh/losamgmt/tross-app)
```

---

**Philosophy:** Keep it simple. Add complexity only when needed. Test what matters. Ship with confidence.
