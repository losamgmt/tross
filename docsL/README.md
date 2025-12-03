# TrossApp Documentation

Welcome to TrossApp documentation. Everything is organized by purpose for easy navigation.

## Documentation Philosophy

**Evergreen Content Only**
- Focus on architectural patterns, decisions, and principles that remain true across versions
- No brittle metrics (test counts, dates, version numbers in prose)
- Document WHY we chose something and HOW it works, not WHAT currently exists

## Ì≥Ç Documentation Structure

```
docs/
‚îú‚îÄ‚îÄ guides/                    Getting started and workflows
‚îú‚îÄ‚îÄ architecture/              Core patterns and decisions
‚îú‚îÄ‚îÄ auth/                      Authentication and authorization
‚îú‚îÄ‚îÄ api/                       API documentation (Swagger/OpenAPI)
‚îú‚îÄ‚îÄ backend/                   Backend-specific docs
‚îú‚îÄ‚îÄ frontend/                  Frontend-specific docs
‚îú‚îÄ‚îÄ security/                  Security patterns and audits
‚îú‚îÄ‚îÄ testing/                   Test strategy and guides
‚îú‚îÄ‚îÄ workflows/                 CI/CD, deployment processes
‚îú‚îÄ‚îÄ implementation-details/    Specific feature implementations
‚îî‚îÄ‚îÄ database/                  Database-specific docs (future)
```

## Ì∫Ä Quick Start

**New to the project?**
1. [Quick Start Guide](guides/QUICK_START.md) - Get running in minutes
2. [Development Workflow](guides/DEVELOPMENT_WORKFLOW.md) - Daily development process
3. [MVP Scope](guides/MVP_SCOPE.md) - Current project scope

## ÌøóÔ∏è Architecture

**Core architectural patterns:**
- [Architecture Lock](architecture/ARCHITECTURE_LOCK.md) - Frozen patterns (Ì¥í)
- [Database Architecture](architecture/DATABASE_ARCHITECTURE.md) - DB design patterns
- [Entity Lifecycle](architecture/ENTITY_LIFECYCLE.md) - State management
- [Validation Architecture](architecture/VALIDATION_ARCHITECTURE.md) - Multi-tier validation
- [ADRs](architecture/decisions/) - Architecture Decision Records

## Ì¥ê Auth & Security

**Authentication and security:**
- [Auth Guide](auth/AUTH_GUIDE.md) - Complete auth implementation
- [Auth0 Integration](auth/AUTH0_INTEGRATION.md) - Auth0 setup
- [Security Audits](security/) - Security patterns and reviews

## Ì≥° API

**API documentation:**
- [API Reference](api/README.md) - RESTful API (Swagger/OpenAPI)
- [CRUD Reference](guides/QUICK_CRUD_REFERENCE.md) - Quick CRUD patterns

## Ì∑™ Testing

**Test strategy and guides:**
- [Testing Guide](testing/TESTING_GUIDE.md) - Testing philosophy and patterns
- [Test Performance Analysis](testing/TEST_PERFORMANCE_ANALYSIS.md) - Test optimization

## Ì∫¢ Deployment

**Deployment and workflows:**
- [CI/CD Setup](workflows/CI_CD.md) - Continuous integration
- [Deployment Guide](workflows/DEPLOYMENT.md) - Production deployment
- [Mobile Deployment](workflows/MOBILE_DEPLOYMENT.md) - Mobile platforms (future)

## Ì¥ß Implementation Details

**Specific feature implementations:**
- [User Status Implementation](implementation-details/USER_STATUS_IMPLEMENTATION.md) - User lifecycle
- [Role Deletion Strategy](implementation-details/ROLE_DELETION_STRATEGY.md) - Role management
- [Validation Implementation](implementation-details/VALIDATION.md) - Validation layer

## Ì≥ù Content Guidelines

### What to Document
‚úÖ Architectural decisions (WHY)  
‚úÖ Patterns and practices (HOW)  
‚úÖ Integration guides  
‚úÖ Troubleshooting guides

### What NOT to Document
‚ùå Test counts, coverage %  
‚ùå Version numbers in prose  
‚ùå Status snapshots

---

**Navigation:** Use Ctrl+P (Cmd+P) to quickly search for any doc file.
