# Tross Project Status

**Last Updated:** February 4, 2026

---

## Current State

### What's Working ✅

- Full authentication flow (Auth0 + dev login)
- Role-based access control (viewer, user, manager, admin)
- Generic entity CRUD (metadata-driven)
- Dashboard with role-based entity charts
- Admin system health monitoring
- Admin audit logs (data + auth events)
- Settings screen (profile + preferences)
- Saved table views (column visibility, density)
- Proactive token refresh
- File attachments on entities (upload, preview, download, delete)
- File preview modal (images, PDFs, text)
- **Mobile-first responsive UX** (touch targets, nav bars, adaptive layouts)
- **Android APK builds** (debug + release)
- **iOS builds** (unsigned IPA via CI)
- **Mobile Auth0 login** (iOS + Android with token exchange)

### In Progress 🔄

**Mobile App Deployment**

- [x] Android build working locally + CI
- [x] iOS build working in CI (macOS runner)
- [x] Auth0 mobile login working (physical device + emulator)
- [ ] Apple Developer Account for App Store
- [ ] Play Store listing

**Admin Files Interface (Phase 6B)**

- [ ] Files tab - Paginated table with filters and search
- [ ] Storage tab - R2 bucket statistics
- [ ] Maintenance tab - Orphan detection and cleanup
- [ ] Settings tab - R2 configuration display

---

## Architecture Quick Reference

### Frontend Widget Hierarchy

```
lib/widgets/
├── atoms/           # Single-purpose primitives
├── molecules/       # Composed atoms
├── organisms/       # Complex UI sections
└── templates/       # Page-level shells
```

### Screen Pattern

```
Screen (<50 lines)
  └── Template (AdaptiveShell or CenteredLayout)
        └── Content Organism
```

### Route Structure

| Route                     | Template       | Body                |
| ------------------------- | -------------- | ------------------- |
| `/login`                  | CenteredLayout | LoginContent        |
| `/home`                   | AdaptiveShell  | DashboardContent    |
| `/settings`               | AdaptiveShell  | SettingsContent     |
| `/:entity`                | AdaptiveShell  | FilterableDataTable |
| `/:entity/:id`            | AdaptiveShell  | EntityDetailScreen  |
| `/admin`                  | AdaptiveShell  | AdminHomeContent    |
| `/admin/system/health`    | AdaptiveShell  | DbHealthDashboard   |
| `/admin/system/logs/:tab` | AdaptiveShell  | TabbedContent       |
| `/admin/system/files`     | AdaptiveShell  | TabbedContent       |
| `/admin/:entity`          | AdaptiveShell  | TabbedContent       |

---

## Key Documentation

| Topic                | Document                                                               |
| -------------------- | ---------------------------------------------------------------------- |
| **Architecture**     | [ARCHITECTURE.md](architecture/ARCHITECTURE.md)                        |
| **ADRs**             | [decisions/](architecture/decisions/)                                  |
| **Entity Naming**    | [ADR-006](architecture/decisions/006-entity-naming-convention.md)      |
| **File Attachments** | [ADR-007](architecture/decisions/007-file-attachments-architecture.md) |
| **API Reference**    | [API.md](reference/API.md)                                             |
| **Authentication**   | [AUTH.md](reference/AUTH.md)                                           |
| **Testing**          | [TESTING.md](reference/TESTING.md)                                     |
| **R2/CORS Config**   | [r2-cors-config.md](operations/r2-cors-config.md)                      |

---

## File Locations

| Category        | Path                                  |
| --------------- | ------------------------------------- |
| Screens         | `lib/screens/`                        |
| Templates       | `lib/widgets/templates/`              |
| Organisms       | `lib/widgets/organisms/`              |
| Molecules       | `lib/widgets/molecules/`              |
| Atoms           | `lib/widgets/atoms/`                  |
| Routing         | `lib/core/routing/`                   |
| Config          | `lib/config/`                         |
| Services        | `lib/services/`                       |
| Entity Metadata | `backend/config/models/*-metadata.js` |

---

## Testing

Run `npm test` to execute all tests. See [TESTING.md](reference/TESTING.md) for philosophy and patterns.

---

_This document tracks current project state. For architectural decisions, see [ADRs](architecture/decisions/)._
