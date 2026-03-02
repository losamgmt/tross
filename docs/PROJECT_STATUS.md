# Tross Project Overview

Quick reference for project architecture and documentation locations.

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

### Route Patterns

| Pattern | Template |
|---------|----------|
| Public pages (login) | CenteredLayout |
| Authenticated pages | AdaptiveShell |

Routes are defined in `lib/core/routing/`. See code for current mappings.

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

_For architectural decisions, see [ADRs](architecture/decisions/)._
