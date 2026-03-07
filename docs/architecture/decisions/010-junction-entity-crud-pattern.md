# ADR-010: Junction Entity CRUD Pattern

**Status:** Accepted  
**Date:** 2026-03-06  
**Deciders:** Architecture Team  
**Category:** Frontend / Schema-Driven UI

---

## Context

TROSS supports many-to-many (M:M) relationships through junction tables (e.g., `customer_unit` links `customers` and `units`). The frontend needed a pattern to:

1. Display related entities in tabs
2. Support full CRUD operations on junction records
3. Maintain schema-driven principles (no per-entity code)
4. Handle both hasMany and M:M relationships uniformly

### Relationship Types

| Type | Example | Junction Table | Query Target |
|------|---------|----------------|--------------|
| hasMany | Customer → Invoices | None | `invoices` |
| manyToMany | Customer ↔ Units | `customer_unit` | `customer_unit` |

---

## Decision

Implement a **unified RelationshipSection widget** that handles both hasMany and M:M relationships through metadata configuration.

### Architecture

```
EntityDetailScreen
  └── Related Tab
        └── RelationshipSection (per relationship)
              ├── Header (icon, title, count)
              ├── Toolbar (Refresh, Create)
              └── AppDataTable
                    ├── Row tap → Modal (with onSuccess callback)
                    └── Row actions → Delete
```

### Key Implementation Details

#### 1. Query Target Selection

For M:M relationships, query the **junction table**, not the target entity:

```dart
final queryEntity = relationship.isManyToMany
    ? _junctionTableToEntity(relationship.through!)  // 'customer_unit'
    : relationship.targetEntity;                      // 'invoices'
```

#### 2. Pre-filling Foreign Keys

When creating new junction records, pre-fill the FK to the parent:

```dart
final prefillData = {filterField: parentEntityId};

// Passed to GenericTableActionBuilders.buildRelatedListToolbarActions()
```

#### 3. onSuccess Callback Chain

Modal row tap and CRUD operations propagate refresh callbacks:

```dart
buildRowTapHandler(
  context: context,
  entityName: queryEntity,
  behavior: RowClickBehavior.modal,
  onSuccess: () {
    refreshKey.currentState?.refresh();  // Refresh section
    onSuccess?.call();                   // Notify parent
  },
);
```

#### 4. Relationship Metadata

Backend metadata defines which relationships appear in Related tabs:

```javascript
// customer-metadata.js
relationships: {
  customer_units: {
    type: 'manyToMany',
    targetEntity: 'unit',
    foreignKey: 'customer_id',
    through: 'customer_units',
    targetKey: 'unit_id',
    showInRelatedTab: true,
    rowClickBehavior: 'modal',
  }
}
```

Frontend filters using `relatedTabRelationships` getter:

```dart
List<Relationship> get relatedTabRelationships =>
    relationships.where((r) => r.showInRelatedTab).toList();
```

---

## Consequences

### Positive

1. **Zero per-entity code**: All relationship rendering is metadata-driven
2. **Unified pattern**: Same widget handles hasMany and M:M
3. **Full CRUD**: Create, Read, Update (via modal), Delete all supported
4. **Composable**: `RelationshipSection` can be reused in other contexts
5. **Refresh propagation**: Parent entity data refreshes when children change

### Negative

1. **Junction table as entity**: Requires separate metadata for junction tables (e.g., `customer_unit-metadata.js`)
2. **defaultIncludes overhead**: Junction metadata should include `defaultIncludes` for related data loading

### Neutral

1. **Row tap behavior configurable**: `rowClickBehavior` can be `modal`, `navigate`, or `none`
2. **File size reduction**: Extracting to widget reduced `entity_detail_screen.dart` by ~120 lines

---

## Files Involved

| File | Role |
|------|------|
| `lib/widgets/organisms/cards/relationship_section.dart` | New standalone widget |
| `lib/screens/entity_detail_screen.dart` | Uses RelationshipSection |
| `lib/utils/row_click_handlers.dart` | Added `onSuccess` callback |
| `lib/utils/generic_table_action_builders.dart` | Toolbar and row actions |
| `lib/models/relationship.dart` | `isManyToMany`, `showInRelatedTab` |
| `lib/models/entity_metadata.dart` | `relatedTabRelationships` getter |

---

## Future Considerations

1. **Inline editing**: Could add edit button to row actions instead of modal-only
2. **Bulk operations**: Multi-select delete on Related tabs
3. **Junction RLS**: Currently uses parent-only RLS; revisit for junction/target table RLS
4. **Lazy loading**: Load Related tab data only when tab is selected

---

## Related ADRs

- **ADR-003**: Schema-Driven UI (SSOT principles)
- **ADR-009**: Granular Permissions (deferred, affects junction access control)
