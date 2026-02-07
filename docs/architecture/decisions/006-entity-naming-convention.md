# ADR 006: Entity Naming Convention

**Status:** Accepted  
**Date:** January 31, 2026

---

## Context

File attachment uploads were failing with 404 errors. Investigation revealed the root cause: inconsistent entity naming across the codebase. The `FileAttachmentService.entityExists()` method received an entity key (`work_order`) but queried it as a table name (the actual table is `work_orders`).

Deeper analysis showed hardcoded mappings scattered throughout the codebase, pattern-matching heuristics (singular→plural conversions), and ambiguous naming that created fragile, error-prone code.

---

## Decision

**All entity naming is EXPLICIT in metadata. No derivation. No pattern matching. No hardcoded maps.**

Each entity metadata file declares these properties explicitly:

| Property            | Format               | Example       | Purpose                                   |
| ------------------- | -------------------- | ------------- | ----------------------------------------- |
| `entityKey`         | snake_case, singular | `work_order`  | Internal key, FK columns, code references |
| `tableName`         | snake_case, plural   | `work_orders` | Database table name AND API URL path      |
| `rlsResource`       | snake_case           | `work_orders` | Permission checks (usually = tableName)   |
| `displayName`       | Title Case, singular | `Work Order`  | UI labels                                 |
| `displayNamePlural` | Title Case, plural   | `Work Orders` | UI nav, list headers                      |

### Rules

1. **Metadata is authoritative** - All code looks up names from metadata, never derives them
2. **Fail-fast validation** - Missing `entityKey` or `tableName` triggers startup failure
3. **Zero backward compatibility** - One convention only, no shims, no fallbacks
4. **API paths use `tableName`** - All REST endpoints use the plural table name

### Example Metadata

```javascript
// backend/config/models/work-order-metadata.js
module.exports = {
  entityKey: "work_order", // ← Explicit, singular
  tableName: "work_orders", // ← Explicit, plural
  rlsResource: "work_orders", // ← Usually matches tableName
  displayName: "Work Order",
  displayNamePlural: "Work Orders",
  // ... other metadata
};
```

### Usage Pattern

```javascript
// Backend: lookup table name from entity key
const metadata = getEntityMetadata(entityKey);
const tableName = metadata.tableName;
```

```dart
// Frontend: lookup table name from entity key
final metadata = EntityMetadataRegistry.tryGet(entityKey);
final tableName = metadata?.tableName;
```

---

## Consequences

### Positive

- **No ambiguity** - Every property has a single, explicit value
- **No bugs from derivation** - Can't get singular/plural wrong if it's explicit
- **Easy to validate** - Startup checks ensure all required properties exist
- **Self-documenting** - Metadata files are the single source of truth

### Negative

- **More verbose metadata** - Each entity file has more properties
- **Migration effort** - All 13 entity files needed updates

### Neutral

- **Sync script updated** - Frontend metadata now includes `entityKey`
- **Hardcoded maps deleted** - `_entityEndpoint()`, `ENTITY_URL_MAP`, etc. removed

---

## Implementation Files

- **Backend metadata:** `backend/config/models/*-metadata.js` (13 files)
- **Validator:** `backend/config/entity-metadata-validator.js`
- **Frontend metadata:** `frontend/lib/config/entities/*.json` (synced)
- **Sync script:** `scripts/sync-entity-metadata.js`
