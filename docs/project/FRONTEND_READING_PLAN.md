# Frontend Reading Plan: Junction Entity Implementation

> **STATUS: ✅ COMPLETED (March 2026)**
>
> This planning document was used to implement M:M relationship support. Implementation is complete. See [Architecture Decisions](#implementation-summary) at the end for the actual patterns used.

## Executive Summary

This document provides a comprehensive reading plan for understanding the Tross frontend architecture before implementing junction entity (M:M relationship) support. The frontend is a **Flutter/Dart** application with **227 Dart files** following an **Atomic Design** pattern (atoms → molecules → organisms → templates).

**Key Finding:** The M:M relationship metadata is already synced to the frontend (`isJunction`, `junctionFor`, `relationships` with `manyToMany` type). The implementation work is to **consume** this metadata in the existing generic components.

---

## Directory Structure Overview

```
frontend/lib/ (227 Dart files)
├── config/        (22 files) - Theme, spacing, table columns, constants
├── core/           (3 files) - Routing (app_router, app_routes, route_guard)
├── generated/      (1 file)  - ResourceType enum (23 values)
├── models/        (12 files) - EntityMetadata, FieldDefinition, Permission, etc.
├── providers/      (5 files) - AppProvider, AuthProvider, DashboardProvider, PreferencesProvider
├── screens/        (6 files) - EntityScreen, EntityDetailScreen, HomeScreen, etc.
├── services/      (42 files) - GenericEntityService, MetadataProvider, FileService, etc.
├── utils/         (17 files) - CrudHandlers, TableCellBuilders, helpers/
└── widgets/      (117 files) - Atomic Design structure
    ├── atoms/     (30 files) - Buttons, cells, inputs, badges
    ├── molecules/ (46 files) - Cards, forms, dialogs, navigation
    ├── organisms/ (38 files) - Tables, forms, modals, complex UI
    └── templates/  (3 files) - AdaptiveShell, CenteredLayout
```

---

## Reading Plan (Priority Order)

### Phase 1: Data Layer Foundation (30 min)

Understanding how metadata flows from JSON → Models → UI.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 1 | [lib/services/entity_metadata.dart](../frontend/lib/services/entity_metadata.dart) | ~200 | EntityMetadataRegistry - singleton that loads `entity-metadata.json` and provides runtime access |
| 2 | [lib/models/entity_metadata.dart](../frontend/lib/models/entity_metadata.dart) | ~400 | EntityMetadata class - complete entity definition including fieldGroups, displayColumns, etc. |
| 3 | [lib/models/field_definition.dart](../frontend/lib/models/field_definition.dart) | ~150 | FieldDefinition class - field types including `foreignKey`, `relatedEntity`, `displayField` |

**Key Insights:**
- EntityMetadataRegistry is initialized in `main.dart` at app startup
- Metadata is loaded from `assets/config/entity-metadata.json` (synced from backend)
- M:M metadata already exists: `isJunction`, `junctionFor`, `relationships` (including `manyToMany` type)
- FK fields have `relatedEntity` and `displayField` for lookup display

### Phase 2: Generic Entity Service (20 min)

Understanding CRUD operations.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 4 | [lib/services/generic_entity_service.dart](../frontend/lib/services/generic_entity_service.dart) | ~200 | ALL entity CRUD through one service - `getAll()`, `getById()`, `create()`, `update()`, `delete()` |
| 5 | [lib/services/api/api_client.dart](../frontend/lib/services/api/api_client.dart) | ~200 | HTTP client that calls backend API |

**Key Insights:**
- `GenericEntityService` works with `Map<String, dynamic>` - no typed models
- Uses `ApiClient` for HTTP calls to `/api/{entityName}` endpoints
- Returns `EntityListResult` with pagination info

### Phase 3: Screens (25 min)

Understanding the two main screens where junction entities will appear.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 6 | [lib/screens/entity_screen.dart](../frontend/lib/screens/entity_screen.dart) | ~200 | **LIST SCREEN** - Generic entity list for ANY entity. Uses `FilterableDataTable` |
| 7 | [lib/screens/entity_detail_screen.dart](../frontend/lib/screens/entity_detail_screen.dart) | ~450 | **DETAIL SCREEN** - Single entity view/edit. Uses `EntityDetailCard` |

**Key Insights:**
- Both screens are 100% metadata-driven - `EntityMetadataRegistry.get(entityName)`
- EntityScreen uses `MetadataTableColumnFactory.forEntity()` to build columns
- EntityDetailScreen supports file attachments via `supportsFileAttachments` flag
- Route: `/customers` → EntityScreen, `/customers/42` → EntityDetailScreen

### Phase 4: Table Components (30 min)

Understanding how tables are built from metadata.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 8 | [lib/services/metadata_table_column_factory.dart](../frontend/lib/services/metadata_table_column_factory.dart) | ~400 | **CRITICAL** - Generates `List<TableColumn>` from metadata. Handles FK fields with `ForeignKeyLookupCell` |
| 9 | [lib/widgets/organisms/tables/data_table.dart](../frontend/lib/widgets/organisms/tables/data_table.dart) | ~400 | AppDataTable - the core table organism |
| 10 | [lib/widgets/organisms/tables/filterable_data_table.dart](../frontend/lib/widgets/organisms/tables/filterable_data_table.dart) | ~150 | FilterableDataTable - composes filters with AppDataTable |

**Key Insights:**
- `MetadataTableColumnFactory.forEntity()` is the entry point for table columns
- FK fields are rendered using `ForeignKeyLookupCell` atom
- Tables use `displayColumns` from metadata to determine visible fields
- Junction entities will naturally show FK columns (customer_id, unit_id)

### Phase 5: FK Cell Rendering (15 min)

Understanding how foreign keys are displayed.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 11 | [lib/widgets/atoms/cells/foreign_key_lookup_cell.dart](../frontend/lib/widgets/atoms/cells/foreign_key_lookup_cell.dart) | ~100 | Loads & displays FK display value with caching |
| 12 | [lib/utils/table_cell_builders.dart](../frontend/lib/utils/table_cell_builders.dart) | ~150 | Helper functions for building table cells |

**Key Insights:**
- `ForeignKeyLookupCell` makes API call to fetch related entity
- Results are cached in `_fkLookupCache` (in-memory)
- Uses `GenericEntityService.getById()` to fetch related record
- Displays `displayField` from related entity (e.g., customer email)

### Phase 6: Form Components (25 min)

Understanding how forms are built from metadata.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 13 | [lib/widgets/organisms/forms/generic_form.dart](../frontend/lib/widgets/organisms/forms/generic_form.dart) | ~200 | Generic form with flat/grouped layouts |
| 14 | [lib/widgets/organisms/modals/entity_form_modal.dart](../frontend/lib/widgets/organisms/modals/entity_form_modal.dart) | ~300 | Modal for create/edit operations |
| 15 | [lib/services/metadata_field_config_factory.dart](../frontend/lib/services/metadata_field_config_factory.dart) | ~700 | **CRITICAL** - Generates form field configs from metadata. Handles FK with async select |

**Key Insights:**
- `MetadataFieldConfigFactory.forEntity()` builds form field configurations
- FK fields become async select dropdowns (loads options from API)
- Form validation comes from field definitions (required, maxLength, etc.)
- Grouped forms use `fieldGroups` from metadata

### Phase 7: Routing (15 min)

Understanding how routes are generated.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 16 | [lib/core/routing/app_router.dart](../frontend/lib/core/routing/app_router.dart) | ~750 | GoRouter configuration with dynamic entity routes |
| 17 | [lib/core/routing/app_routes.dart](../frontend/lib/core/routing/app_routes.dart) | ~100 | Route helpers (entityList, entityDetail) |

**Key Insights:**
- Routes are generated dynamically from EntityMetadataRegistry
- Any entity in metadata gets routes: `/{tableName}` and `/{tableName}/:id`
- RouteGuard checks permissions via `PermissionService`

### Phase 8: Providers (15 min)

Understanding state management.

| Priority | File | Lines | Purpose |
|----------|------|-------|---------|
| 18 | [lib/providers/app_provider.dart](../frontend/lib/providers/app_provider.dart) | ~100 | Root provider setup |
| 19 | [lib/providers/auth_provider.dart](../frontend/lib/providers/auth_provider.dart) | ~200 | Authentication state, user info |
| 20 | [lib/providers/preferences_provider.dart](../frontend/lib/providers/preferences_provider.dart) | ~300 | User preferences state |

---

## Implementation Strategy

### What Already Works

1. **Junction entities can be listed**: EntityScreen will work out-of-the-box for `/customer_units`
2. **FK lookups display correctly**: ForeignKeyLookupCell shows customer email, unit identifier
3. **Create/Edit forms work**: EntityFormModal with FK dropdowns

### What Needs Enhancement

For optimal junction entity UX, consider:

1. **Related Entity Tabs on Detail Screen**
   - Customer detail shows "Units" tab with M:M relationship
   - Unit detail shows "Customers" tab
   - Needs: Read `relationships` from metadata, render related entity tables

2. **Smart Junction Creation**
   - Creating a CustomerUnit from Customer context should pre-fill customer_id
   - Needs: Pass context to EntityFormModal

3. **Inline Add/Remove on M:M**
   - "Add Unit" button on Customer detail creates CustomerUnit
   - Needs: Specialized action that creates junction record

### Files to Modify

| File | Change |
|------|--------|
| `models/entity_metadata.dart` | Add `relationships`, `isJunction`, `junctionFor`, `defaultIncludes` fields to EntityMetadata class |
| `services/entity_metadata.dart` | Parse new relationship fields in `EntityMetadata.fromJson()` |
| `services/generic_entity_service.dart` | Add `include` parameter to `getById()` for M:M fetching |
| `screens/entity_detail_screen.dart` | Add related entities section using `relationships` metadata |
| `widgets/organisms/cards/entity_detail_card.dart` | Support rendering related entity lists |

---

## Metadata Already Synced (Reference)

### Junction Entity Example: `customer_unit`

```json
{
  "customer_unit": {
    "entityKey": "customer_unit",
    "isJunction": true,
    "junctionFor": { "entity1": "customer", "entity2": "unit" },
    "relationships": {
      "customer": {
        "type": "belongsTo",
        "table": "customers",
        "foreignKey": "customer_id",
        "fields": ["id", "first_name", "last_name", "email"]
      },
      "unit": {
        "type": "belongsTo",
        "table": "units",
        "foreignKey": "unit_id",
        "fields": ["id", "unit_identifier", "property_id"]
      }
    },
    "displayColumns": ["customer_id", "unit_id", "role", "status"]
  }
}
```

### Entity with M:M Example: `customer`

```json
{
  "customer": {
    "relationships": {
      "units": {
        "type": "manyToMany",
        "table": "units",
        "through": "customer_units",
        "foreignKey": "customer_id",
        "targetKey": "unit_id",
        "fields": ["id", "unit_identifier", "property_id"],
        "description": "Units owned or occupied by this customer"
      }
    }
  }
}
```

---

## Testing Strategy

| Test Type | Location | Focus |
|-----------|----------|-------|
| Widget Tests | `test/widgets/` | Table columns render FKs correctly |
| Service Tests | `test/services/` | GenericEntityService with include param |
| Integration Tests | `test/integration/` | Entity screen loads junction entities |

---

## Time Estimate

| Phase | Time |
|-------|------|
| Phase 1-2: Data Layer | 50 min reading |
| Phase 3-5: Tables | 70 min reading |
| Phase 6-8: Forms/Routes | 55 min reading |
| **Total Reading** | **~3 hours** |
| **Implementation** | ~4-6 hours |

---

## Quick Reference Commands

```bash
# Count files by directory
cd frontend/lib && for dir in */; do echo "$dir: $(find $dir -name '*.dart' | wc -l)"; done

# Find relationship usages
grep -r "relationship" lib/ --include="*.dart"

# Run frontend tests
flutter test

# Run specific test file
flutter test test/services/entity_metadata_test.dart
```

---

## Implementation Summary

> **Added March 2026 after completion**

### What Was Implemented

| Feature | Location | Description |
|---------|----------|-------------|
| **Related Tab** | `entity_detail_screen.dart` | Details/Related tab layout for entities with relationships |
| **M:M Query Pattern** | `_buildRelationshipSection()` | Queries junction table for M:M, target table for hasMany |
| **Related List Actions** | `generic_table_action_builders.dart` | `buildRelatedListToolbarActions()`, `buildRelatedListRowActions()` |
| **Pre-fill FK on Create** | `_showEntityForm()` | `defaultValues` param pre-fills FK when creating from Related tab |
| **Relationship Model** | `relationship.dart` | `isManyToMany`, `showInRelatedTab`, `through`, `targetKey` |
| **Entity Metadata Helpers** | `entity_metadata.dart` | `relatedTabRelationships`, `hasRelatedTab` getters |

### Key Architecture Patterns

1. **Junction Table Query**: For M:M relationships, query the junction entity (`customer_unit`) not the target (`units`)
2. **FK Pre-fill**: When creating from Related tab, pre-fill the FK pointing to the current entity
3. **Role-guarded Actions**: All CRUD actions use `PermissionService.hasPermission()` with junction entity's `rlsResource`
4. **Compact Table Mode**: Related lists use `TableDensity.compact` and delete-only row actions (edit via row click)

### Files Modified

- `lib/screens/entity_detail_screen.dart` - Added Related tab, `_buildRelationshipSection()`
- `lib/utils/generic_table_action_builders.dart` - Added Related list action builders
- `lib/models/entity_metadata.dart` - Added relationship helper getters
- `lib/models/relationship.dart` - Complete Relationship model with M:M support
- `lib/utils/entity_icon_resolver.dart` - Added missing icons (groups, meeting_room, etc.)
