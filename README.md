# The Tross App

**Professional work order management system with skills-based matching**

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Quick Start:** [docs/QUICK_START.md](docs/QUICK_START.md) | **Development:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🚀 Production

**Live Application:**
- **Frontend:** https://trossapp.vercel.app
- **Backend API:** https://tross-api-production.up.railway.app
- **API Docs:** https://tross-api-production.up.railway.app/api-docs
- **Health Check:** https://tross-api-production.up.railway.app/api/health

**Infrastructure:**
- Frontend hosting: Vercel (auto-deploy from `main` branch)
- Backend hosting: Railway (auto-deploy from `main` branch)
- Database: PostgreSQL on Railway
- Authentication: Auth0 OAuth2/OIDC

**Monitoring:** See [docs/HEALTH_MONITORING.md](docs/HEALTH_MONITORING.md) for setup

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

### Core Documentation
- **[Quick Start](docs/QUICK_START.md)** - Get up and running in 5 minutes
- **[Architecture](docs/ARCHITECTURE.md)** - Core patterns, decisions, and locked patterns
- **[Development](docs/DEVELOPMENT.md)** - Daily workflow and code organization (includes fork workflow)
- **[Testing](docs/TESTING.md)** - Test philosophy and patterns (3416+ tests: 1675 backend, 1553 frontend, 188 E2E)
- **[Security](docs/SECURITY.md)** - Defense-in-depth architecture
- **[Authentication](docs/AUTH.md)** - Dual auth (dev + Auth0), RBAC
- **[API](docs/API.md)** - RESTful patterns and conventions
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment and CI/CD

### Collaboration & Deployment
- **[Fork Workflow Guide](docs/FORK_WORKFLOW_GUIDE.md)** - Step-by-step guide for collaborators (AI-empowered, non-technical friendly)
- **[CI/CD Guide](docs/CI_CD_GUIDE.md)** - Complete pipeline, fork workflow, deployment automation
- **[Railway Deployment](docs/RAILWAY_DEPLOYMENT.md)** - Backend hosting ($10-15/month, PostgreSQL included)
- **[Vercel Deployment](docs/VERCEL_DEPLOYMENT.md)** - Frontend hosting (free tier, PR previews)
- **[Branch Protection Setup](docs/GITHUB_BRANCH_PROTECTION.md)** - GitHub UI configuration guide
- **[Pipeline Quick Guide](docs/PIPELINE_QUICK_GUIDE.md)** - Non-technical overview of development pipeline
- **[GitHub Codespaces](docs/CODESPACES.md)** - Cloud dev environment for non-technical collaborators
- **[Contributors Guide](CONTRIBUTORS.md)** - How to contribute, fork workflow, testing requirements

### Production Operations
- **[Health Monitoring](docs/HEALTH_MONITORING.md)** - Monitoring setup, metrics, alerting, incident response
- **[Rollback Procedures](docs/ROLLBACK.md)** - Emergency rollback guide for backend, frontend, database

### Reference Documentation
- **[Database Architecture](docs/architecture/DATABASE_ARCHITECTURE.md)** - Schema design and migrations
- **[Entity Lifecycle](docs/architecture/ENTITY_LIFECYCLE.md)** - Data flow patterns
- **[Validation Architecture](docs/architecture/VALIDATION_ARCHITECTURE.md)** - Triple-tier validation
- **[Environment Variables](backend/ENVIRONMENT_VARIABLES.md)** - Configuration reference

> **📖 Full Documentation Index:** [docs/README.md](docs/README.md)

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
- See [API Documentation](docs/API.md) for details

## 🔒 Security Features

> **⚠️ SECURITY NOTE:** This repository contains source code only. All secrets, API keys, database credentials, and sensitive configuration are stored as environment variables and **never** committed to version control. See [backend/.env.example](backend/.env.example) for configuration template.

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

### Environment Variables Security

All sensitive data is configured via environment variables:
- **Database credentials** (DB_PASSWORD, DATABASE_URL)
- **Auth0 secrets** (AUTH0_CLIENT_SECRET)
- **JWT signing keys** (JWT_SECRET)
- **API keys** and third-party service credentials

**Production deployments** (Railway, Vercel) store these securely in their respective platforms. Never commit `.env` files to git.

## 🚦 Development Workflow

### Code Quality

```bash
npm run lint     # ESLint + Flutter analyze
npm run format   # Prettier + dart format
npm run clean    # Reset build artifacts
```

### All Available Scripts

```bash
# Development - Two-Axis Configuration
npm run dev:backend              # Start backend server (nodemon) on localhost:3001
npm run dev:frontend             # Local frontend → localhost backend (dev auth enabled)
npm run dev:frontend:prod-backend # Local frontend → Railway backend (dev auth disabled, Auth0 only)

# Testing (3416+ tests total)
npm test                  # Run all tests (backend + frontend)
npm run test:backend      # Backend Jest tests (1675+ tests)
npm run test:frontend     # Flutter tests (1553+ tests)
npm run test:e2e          # Playwright E2E tests (188 tests)
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

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

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
# Testing admin bypass
