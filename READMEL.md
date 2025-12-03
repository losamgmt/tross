# The Tross App

**Professional work order management system with skills-based matching**

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Quick Start:** [docs/QUICK_START.md](docs/QUICK_START.md) | **Development:** [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md) | **API Docs:** http://localhost:3001/api-docs

---

## 🎯 Overview

The Tross App is a modern, full-stack application for efficient work order management with intelligent skills-based matching. Built with Flutter for cross-platform frontend and Node.js/Express for a robust REST API backend.

**Current Status:** Core platform complete with full authentication, user/role management, and comprehensive testing. Ready for work order feature implementation.

### ✨ Architecture Principles

- **KISS**: Simple, focused components doing one thing well
- **Security-First**: Defense-in-depth validation, Auth0 OAuth2/OIDC, RBAC
- **API-First**: RESTful design with comprehensive OpenAPI documentation
- **Test-Driven**: Comprehensive test coverage across unit, integration, and E2E layers
- **Production-Ready**: Rate limiting, timeouts, error handling, audit logging

## 🏗️ Architecture

**Stack:**
- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** Flutter (web + mobile)
- **Auth:** Auth0 OAuth2/OIDC with dev mode fallback
- **Testing:** Jest (backend) + Flutter Test (widget) + Playwright (E2E)
- **Infrastructure:** Docker Compose + npm workspaces

```
TrossApp/
├── frontend/          # Flutter application
│   ├── lib/
│   │   └── main.dart  # Main application entry
│   ├── pubspec.yaml   # Flutter dependencies
│   └── test/          # Flutter unit tests
├── backend/           # Node.js API server
│   ├── server.js      # Express server with CORS, security
│   ├── package.json   # Backend dependencies
│   └── __tests__/     # Jest test suite
├── scripts/           # Development automation
│   ├── start-dev.bat  # Start development environment
│   └── stop-dev.bat   # Clean shutdown script
├── docs/              # Documentation
└── package.json       # Monorepo configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18+
- **Flutter**: v3.x+
- **Git**: Latest version

### 1️⃣ Clone & Install

```bash
git clone <repository-url>
cd TrossApp
npm install
cd frontend && flutter pub get
```

### 2️⃣ Development Mode

```bash
# Option 1: Use our automation scripts (Windows)
./scripts/start-dev.bat

# Option 2: Manual startup
npm run dev:backend    # Backend on :3001
npm run dev:frontend   # Frontend on :8080
```

### 3️⃣ Access Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001/api/health  
- **API Documentation**: http://localhost:3001/api-docs (Swagger UI)
- **Backend Health**: http://localhost:3001/api/health

---

## 📚 Documentation

- **[Development Workflow](docs/DEVELOPMENT_WORKFLOW.md)** - Development practices and workflows
- **[Testing Guide](docs/testing/TESTING_GUIDE.md)** - Testing philosophy and patterns
- **[API Documentation](docs/api/README.md)** - REST API reference
- **[Architecture Decisions](docs/architecture/decisions/)** - Key design choices (ADRs)
- **[Database Architecture](docs/DATABASE_ARCHITECTURE.md)** - Schema design and migrations
- **[Authentication Guide](docs/auth/AUTH_GUIDE.md)** - Auth0 integration and RBAC
- **[Environment Variables](backend/ENVIRONMENT_VARIABLES.md)** - Configuration reference

---

## 📱 Frontend Stack

**Framework**: Flutter

- **Language**: Dart
- **UI**: Material 3 with custom TrossApp branding
- **HTTP**: http package for API communication
- **Architecture**: StatefulWidget with clean state management

**Design System**:

- **Primary**: Bronze (#CD7F32)
- **Secondary**: Honey Yellow (#FFB90F)
- **Accent**: Walnut (#8B4513)
- **Responsive**: Mobile-first with desktop optimization
- **Architecture**: Atomic Design System (atoms, molecules, organisms)
- **State Management**: Provider pattern with clean separation

## 🔧 Backend Stack

**Runtime**: Node.js

- **Framework**: Express
- **Database**: PostgreSQL with optimized indexes
- **Auth**: Auth0 OAuth2/OIDC + JWT (RS256)
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest, Supertest

**API Design**:

- RESTful endpoints following OpenAPI 3.0 specification
- Comprehensive health checks and monitoring
- See [API Documentation](docs/api/README.md) for details

## 🔒 Security Features

- **Authentication**: Auth0 OAuth2/OIDC with PKCE flow for web, development tokens for testing
- **Authorization**: Role-based access control (RBAC) with dynamic permission system
- **Triple-Tier Validation**: Database constraints, API validation, UI input validation
- **Audit Logging**: Complete audit trail for all data changes
- **Helmet.js**: Content Security Policy, XSS protection
- **CORS**: Configured for development origins
- **Rate Limiting**: Endpoint-specific rate limits to prevent abuse
- **Request Timeouts**: Configurable timeouts for all API operations
- **Input Sanitization**: Comprehensive validation with type coercion
- **Error Handling**: Secure error messages, no stack traces in production
- **Process Management**: Graceful shutdown handling

## 🚦 Development Workflow

### Code Quality

```bash
npm run lint     # ESLint + Flutter analyze
npm run format   # Prettier + dart format
npm run clean    # Reset build artifacts
```

### All Available Scripts

```bash
# Development
npm run dev:backend       # Start backend server (nodemon)
npm run dev:frontend      # Start Flutter web (Chrome)

# Testing
npm test                  # Run all tests (backend + frontend)
npm run test:backend      # Backend Jest tests
npm run test:frontend     # Flutter tests
npm run test:e2e          # Playwright end-to-end tests
npm run test:all          # All tests including E2E
npm run test:watch        # Watch mode for backend tests
npm run test:coverage     # Generate coverage reports

# Database
npm run db:start          # Start PostgreSQL (Docker)
npm run db:stop           # Stop PostgreSQL
npm run db:migrate        # Run migrations
npm run db:seed           # Seed database
npm run db:reset          # Reset database
npm run db:backup         # Backup database

# Build & Deploy
npm run build:all         # Build backend + frontend
npm run docker:build      # Build production Docker images
npm run docker:up         # Start production containers
npm run deploy:prod       # Full production deployment

# CI/CD
npm run ci:test           # CI test suite
npm run ci:build          # CI build process
npm run ci:deploy         # CI deployment

# Utilities
npm run clean:flutter     # Clean Flutter build cache
```

### Performance Monitoring

- Backend: Memory usage, uptime tracking
- Frontend: Response time metrics, connection status
- Load Testing: Artillery configuration included

## 📂 Project Structure

### Monorepo Architecture

- **Shared Dependencies**: npm workspaces for unified dependency management
- **Unified Scripts**: Cross-platform development commands in root package.json
- **Consistent Tooling**: ESLint, Prettier, Jest configuration shared across workspace
- **Coordinated Development**: Single repository for frontend, backend, and infrastructure

### File Organization

```
├── backend/
│   ├── server.js           # 🔥 Main Express application
│   ├── package.json        # Backend-specific dependencies
│   └── __tests__/
│       ├── server.test.js  # API endpoint tests
│       └── setup.js        # Test environment configuration
├── frontend/
│   ├── lib/main.dart       # 🎨 Flutter application
│   ├── pubspec.yaml        # Flutter dependencies & metadata
│   └── test/app_test.dart  # Widget tests
```

## 🌍 Deployment

### Development Environment

- **Local**: Flutter web-server + Node.js with hot reload
- **Docker**: Containerized development environment for consistency

### Production

- **Frontend**: Static site deployment (Vercel, Netlify, or similar)
- **Backend**: Node.js hosting (Railway, Render, AWS ECS, or similar)
- **Database**: Managed PostgreSQL service
- **Monitoring**: Application insights and error tracking

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

1. **Clone** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Test** your changes: `npm test`
4. **Commit** with conventional format: `git commit -m 'feat: add amazing feature'`
5. **Push** and create Pull Request

### Code Standards

- **KISS Principle**: Keep it simple, stupid
- **Clean Code**: Self-documenting, minimal complexity
- **Consistent Naming**: camelCase (JS), snake_case (Dart)
- **Error Handling**: Comprehensive, user-friendly messages

## 📋 Project Status & Roadmap

### ✅ Phase 1: Core Platform (COMPLETE)

- [x] **Backend API**: RESTful endpoints with OpenAPI/Swagger documentation
- [x] **Authentication & Authorization**: Auth0 OAuth2/OIDC + dev mode, role-based permissions
- [x] **User Management**: Full CRUD with validation, audit logging, status tracking
- [x] **Role Management**: Dynamic role system with permission configuration
- [x] **Security**: Triple-tier validation (database, API, UI), rate limiting, timeouts
- [x] **Frontend**: Flutter web app with schema-driven UI and atomic design
- [x] **Testing**: 2,615 tests (1,023 backend + 1,561 frontend + 31 E2E)
- [x] **Documentation**: Professional structure with guides and ADRs
- [x] **Development Tools**: Automation scripts, health checks, error handling

### 🚀 Phase 2: Work Order Features (NEXT)

- [ ] Work order CRUD operations
- [ ] Skills-based matching algorithm
- [ ] Work order assignment and status tracking
- [ ] Real-time notifications

### Phase 3: Advanced Features

- [ ] Mobile app deployment
- [ ] Advanced analytics dashboard
- [ ] Integration APIs
- [ ] Performance optimization

## 📞 Support

**License**: MIT

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for team information and contribution guidelines.

---

_Built with Flutter & Node.js_
