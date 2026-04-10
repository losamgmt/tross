# GAP-4: Entity Structure Classification

**Status:** 📋 DESIGN  
**Priority:** LOW (safe, no behavior change)  
**Parent:** [METADATA-COMPLETION-PLAN.md](../METADATA-COMPLETION-PLAN.md)

---

## Current State

| Component | Status |
|-----------|--------|
| `entity-traits.js` ENTITY_STRUCTURE enum | ✅ EXISTS |
| Helper functions (`hasStructure`, `isJunction`) | ✅ EXISTS |
| Entities using `structureType` | ❌ 0 of 34 (default: STANDARD) |

---

## Available Structure Types (ACTUAL)

From `config/entity-traits.js` (verified):

```javascript
const ENTITY_STRUCTURE = Object.freeze({
  STANDARD: 'standard',      // Normal entity with full CRUD, navigation, relationships
  JUNCTION: 'junction',      // Many-to-many join table (no navigation, minimal fields)
  POLYMORPHIC: 'polymorphic', // Entity with type discriminator (future use)
});
```

**Note:** Only 3 structure types exist. Default is `STANDARD` if not specified.

---

## Entity Classification

### STANDARD (Default)
Most entities - full CRUD, navigation, relationships:

| Entity | Notes |
|--------|-------|
| `customer` | Core business entity |
| `property` | Core business entity |
| `work_order` | Workflow entity |
| `invoice` | Workflow entity |
| `quote` | Workflow entity |
| `user` | Core identity |
| `technician` | Profile entity |
| `vendor` | Business entity |
| ... (30 more) | Most entities are STANDARD |

### JUNCTION
Many-to-many linking tables (minimal fields, no nav):

| Entity | Links |
|--------|-------|
| `visit_technician` | visit ↔ technician |
| `visit_subcontractor` | visit ↔ subcontractor |
| `property_role` | property ↔ role |

### POLYMORPHIC (Future)
Entities using type discriminator pattern:

| Entity | Pattern |
|--------|---------|
| `work_order` | `origin_type` + `origin_id` polymorphic FK |
| (future) | Type discriminator pattern |

---

## Implementation

### Pattern

Add to each metadata file (only if NOT standard):

```javascript
// In visit-technician-metadata.js (junction table)
const visitTechnicianMetadata = {
  entityKey: 'visit_technician',
  structureType: 'junction',  // ← Only add if NOT standard
  // ... rest of metadata
};
```

**Note:** Standard entities don't need `structureType` — it defaults to `'standard'`.

### Validation

Validation already exists in `entity-traits.js`:

```javascript
function hasStructure(metadata, structureType) {
  // Default to STANDARD if not specified
  const entityStructure = metadata.structureType || ENTITY_STRUCTURE.STANDARD;
  return entityStructure === structureType;
}
```

### Usage Example

```javascript
const { isJunction } = require('./entity-traits');

// In generic-entity-service.js
if (isJunction(entityMetadata)) {
  // Skip navigation, minimal audit
}
```

---

## Benefits

1. **UI generation:** Junction tables hidden from nav
2. **Query behavior:** Junction tables use simpler queries
3. **Future:** Polymorphic structure enables discriminator patterns

---

## Implementation Checklist

- [ ] Identify junction tables (3 entities)
- [ ] Add `structureType: 'junction'` to those 3 metadata files
- [ ] Verify validation uses existing `hasStructure()` helper
- [ ] Standard entities need NO changes (default applies)
