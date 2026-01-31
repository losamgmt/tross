# Widget Architecture Audit

**Date:** January 30, 2026  
**Status:** Complete ✅

---

## Executive Summary

This document captures the complete audit of the TrossApp frontend widget architecture. The audit identifies:
- **2 unused templates** to delete
- **2 unused layout organisms** (tests only, no production)
- **1 major duplication** to unify (TabbedPage ↔ TabbedContainer)
- **4 content organisms** with inconsistent scroll handling
- **1 underutilized molecule** (ScrollableContent)

---

## 1. Screens (lib/screens/)

| Screen | Template | Content Body | Lines | Pattern | Status |
|--------|----------|--------------|-------|---------|--------|
| `home_screen.dart` | `AdaptiveShell` | `DashboardContent` | ~34 | Thin Shell | ✅ Good |
| `admin_screen.dart` | `AdaptiveShell` | `AdminHomeContent` | ~27 | Thin Shell | ✅ Good |
| `settings_screen.dart` | `AdaptiveShell` | `SettingsContent` | ~26 | Thin Shell | ✅ Good |
| `login_screen.dart` | `CenteredLayout` | `LoginContent` | ~117 | Thin Shell | ⚠️ Has auth handlers |
| `entity_screen.dart` | `AdaptiveShell` | `FilterableDataTable` | ~189 | StatefulWidget | ⚠️ Complex |
| `entity_detail_screen.dart` | `AdaptiveShell` | `EntityDetailCard`/`GenericForm` | ~380 | StatefulWidget | ⚠️ Complex |

### Notes
- **Thin Shell screens** (home, admin, settings) are excellent - <50 lines, delegate to template + content organism
- **login_screen.dart** has auth handlers that need context for navigation (acceptable)
- **entity_screen.dart** and **entity_detail_screen.dart** are StatefulWidget due to CRUD state management

---

## 2. Inline Router Screens (lib/core/routing/app_router.dart)

| Widget | Template | Body | Pattern | Status |
|--------|----------|------|---------|--------|
| `_AdminHealthScreen` | `AdaptiveShell` | `DbHealthDashboard.api()` | Single-column | ✅ Good |
| `_AdminLogsScreen` | `AdaptiveShell` | `TabbedPage` (URL-synced) | URL Tabs | ✅ Good |
| `_AdminFilesScreen` | `AdaptiveShell` | `TabbedContainer` (local state) | Local Tabs | ✅ Good |
| `_AdminEntityScreen` | `AdaptiveShell` | `TabbedContainer` (local state) | Local Tabs | ✅ Good |

### Tab Content Details

#### _AdminLogsScreen (TabbedPage - URL synced)
- Tab `data`: DataChanges table via AsyncDataProvider
- Tab `auth`: AuthEvents table via AsyncDataProvider

#### _AdminFilesScreen (TabbedContainer - local state)
- Tab `Files`: UnderConstructionDisplay (file browser)
- Tab `Storage`: UnderConstructionDisplay (R2 stats)
- Tab `Maintenance`: UnderConstructionDisplay (cleanup utilities)
- Tab `Settings`: UnderConstructionDisplay (R2 config)

#### _AdminEntityScreen (TabbedContainer - local state)
- Tab `Permissions`: DataMatrix showing role×operation grid
- Tab `Validation`: KeyValueList showing field validation rules

---

## 3. Templates (lib/widgets/templates/)

| Template | Purpose | Prod Usages | Test Usages | Status |
|----------|---------|-------------|-------------|--------|
| `AdaptiveShell` | Authenticated shell (sidebar/appbar) | **10** | 8 | ✅ KEEP |
| `CenteredLayout` | Unauthenticated centered layout | **1** | 15 | ✅ KEEP |
| `TabbedPage` | URL-synced tabs | **1** | 0 | ⚠️ UNIFY |
| `DashboardPage` | Card grid template | **0** | 0 | ❌ DELETE |
| `MasterDetailLayout` | Split-pane template | **0** | 0 | ❌ DELETE |
| `templates.dart` | Barrel export | — | — | ✅ KEEP |

### Detailed Usage Counts

#### AdaptiveShell (10 production usages)
1. `home_screen.dart` - HomeScreen
2. `admin_screen.dart` - AdminScreen
3. `settings_screen.dart` - SettingsScreen
4. `entity_screen.dart` - EntityScreen (2 usages: error + normal)
5. `entity_detail_screen.dart` - EntityDetailScreen (2 usages: error + normal)
6. `app_router.dart` - _AdminHealthScreen
7. `app_router.dart` - _AdminLogsScreen
8. `app_router.dart` - _AdminFilesScreen
9. `app_router.dart` - _AdminEntityScreen

#### CenteredLayout (1 production usage)
1. `login_screen.dart` - LoginScreen (uses `.responsive()` factory)

#### TabbedPage (1 production usage)
1. `app_router.dart` - _AdminLogsScreen

### Dead Code Details

#### DashboardPage - UNUSED
- Location: `lib/widgets/templates/dashboard_page.dart`
- Purpose: Card grid layout template
- Usages: Only docstring examples, zero imports
- Recommendation: **DELETE**

#### MasterDetailLayout - UNUSED
- Location: `lib/widgets/templates/master_detail_layout.dart`
- Purpose: Split-pane layout for list→detail
- Usages: Only docstring examples, zero imports
- Recommendation: **DELETE**

---

## 4. Layout Organisms (lib/widgets/organisms/layout/)

| Organism | Purpose | Prod Usages | Test Usages | Status |
|----------|---------|-------------|-------------|--------|
| `TabbedContainer` | Local-state tabs | **2** | TBD | ⚠️ UNIFY with TabbedPage |
| `ActionGrid` | Responsive action button grid | **0** | 6 | ⚠️ UNUSED (tests only) |
| `CardGrid` | Responsive card grid | **0** | 7 | ⚠️ UNUSED (tests only) |

### Detailed Usage Counts

#### TabbedContainer (2 production usages)
1. `app_router.dart` - _AdminFilesScreen (4 tabs)
2. `app_router.dart` - _AdminEntityScreen (2 tabs)

#### ActionGrid (0 production usages)
- Only used in test file: `action_grid_test.dart`
- Consider: **DELETE or promote to production use**

#### CardGrid (0 production usages)
- Only used in test file: `card_grid_test.dart`
- Consider: **DELETE or promote to production use**

---

## 5. Content Organisms (Page Bodies)

| Organism | Used By | Scroll Pattern | Status |
|----------|---------|----------------|--------|
| `DashboardContent` | `HomeScreen` | Inline `SingleChildScrollView` | ⚠️ Migrate to ScrollableContent |
| `AdminHomeContent` | `AdminScreen` | Inline `SingleChildScrollView` | ⚠️ Migrate to ScrollableContent |
| `SettingsContent` | `SettingsScreen` | Inline `SingleChildScrollView` | ⚠️ Migrate to ScrollableContent |
| `LoginContent` | `LoginScreen` | No scroll (inside CenteredLayout) | ✅ OK |

### Other Key Organisms

| Organism | Used By | Prod Usages | Status |
|----------|---------|-------------|--------|
| `DbHealthDashboard` | `_AdminHealthScreen` | **1** | ✅ Good |
| `FilterableDataTable` | `EntityScreen` | **1** | ✅ Good |
| `UnderConstructionDisplay` | `_AdminFilesScreen` | **4** | ✅ Good (placeholder) |

---

## 6. Molecules

### ScrollableContent (lib/widgets/molecules/containers/)

| Location | Usages | Status |
|----------|--------|--------|
| `scrollable_content.dart` | **2** (entity_detail_screen only) | ⚠️ Underutilized |

**Current Usage:**
- `entity_detail_screen.dart` line 232 (view mode)
- `entity_detail_screen.dart` line 290 (edit mode)

**Should Also Use:**
- `DashboardContent`
- `AdminHomeContent`
- `SettingsContent`

---

## 7. Identified Issues

### 7.1 DUPLICATION: TabbedPage vs TabbedContainer

| Aspect | TabbedPage (Template) | TabbedContainer (Organism) |
|--------|----------------------|---------------------------|
| Location | `templates/tabbed_page.dart` | `organisms/layout/tabbed_container.dart` |
| State | URL-synced via go_router | Local TabController |
| Tab Config | `TabDefinition` | `TabConfig` |
| Content | `contentBuilder(tabId)` | `TabConfig.content` |
| Usages | 1 | 2 |

**Resolution:** Create unified `TabbedContent` with `syncWithUrl: bool` parameter.

### 7.2 DEAD CODE: Unused Templates

| File | Lines | Action |
|------|-------|--------|
| `dashboard_page.dart` | ~200 | DELETE |
| `master_detail_layout.dart` | ~150 | DELETE |

### 7.3 DEAD CODE: Unused Layout Organisms

| File | Lines | Action |
|------|-------|--------|
| `action_grid.dart` | ~100 | DELETE or find production use |
| `card_grid.dart` | ~100 | DELETE or find production use |

### 7.4 INCONSISTENCY: Scroll Handling

Three content organisms use inline `SingleChildScrollView`:
- `DashboardContent`
- `AdminHomeContent`
- `SettingsContent`

One screen uses the `ScrollableContent` molecule:
- `EntityDetailScreen`

**Resolution:** Migrate all to use `ScrollableContent` for consistency.

---

## 8. Architecture Patterns

### 8.1 Thin Shell Pattern (Recommended)

```
Screen (<50 lines)
  └── Template (AdaptiveShell/CenteredLayout)
        └── Content Organism (DashboardContent, etc.)
```

**Following this pattern:**
- HomeScreen ✅
- AdminScreen ✅
- SettingsScreen ✅
- LoginScreen ✅ (with auth handlers)

### 8.2 Structural Skeletons

| Skeleton | Template | Body Type | Count |
|----------|----------|-----------|-------|
| Single-Column | `AdaptiveShell` | Content organism | 6 |
| URL-Tabbed | `AdaptiveShell` | `TabbedPage` | 1 |
| Local-Tabbed | `AdaptiveShell` | `TabbedContainer` | 2 |
| Centered | `CenteredLayout` | Content organism | 1 |

---

## 9. Recommended Actions

### Phase 1: Delete Dead Code (Low Risk)
1. ❌ Delete `dashboard_page.dart`
2. ❌ Delete `master_detail_layout.dart`
3. 📝 Update `templates.dart` barrel export
4. 🧪 Run tests

### Phase 2: Consider ActionGrid/CardGrid
1. 🔍 Determine if these will be used in future features
2. ❌ If no plans: Delete both files
3. ✅ If plans exist: Keep and document intended use

### Phase 3: Unify Tab Components
1. ✨ Create `TabbedContent` in `organisms/layout/`:
   ```dart
   TabbedContent({
     required List<TabConfig> tabs,
     bool syncWithUrl = false,
     String? baseRoute,      // required if syncWithUrl
     String? currentTabId,   // required if syncWithUrl
   })
   ```
2. 📝 Migrate `_AdminLogsScreen` → `TabbedContent(syncWithUrl: true)`
3. 📝 Migrate `_AdminFilesScreen` → `TabbedContent(syncWithUrl: false)`
4. 📝 Migrate `_AdminEntityScreen` → `TabbedContent(syncWithUrl: false)`
5. ❌ Delete `TabbedPage` and `TabbedContainer`
6. 🧪 Run tests

### Phase 4: Standardize Scrolling
1. 📝 Migrate `DashboardContent` → use `ScrollableContent`
2. 📝 Migrate `AdminHomeContent` → use `ScrollableContent`
3. 📝 Migrate `SettingsContent` → use `ScrollableContent`
4. 🧪 Run tests

---

## 10. Component Inventory Summary

### Production Components (KEEP)

| Layer | Component | Usages |
|-------|-----------|--------|
| Template | `AdaptiveShell` | 10 |
| Template | `CenteredLayout` | 1 |
| Organism | `TabbedContainer` | 2 (unify) |
| Organism | `DashboardContent` | 1 |
| Organism | `AdminHomeContent` | 1 |
| Organism | `SettingsContent` | 1 |
| Organism | `LoginContent` | 1 |
| Organism | `DbHealthDashboard` | 1 |
| Organism | `FilterableDataTable` | 1 |
| Organism | `UnderConstructionDisplay` | 4 |
| Molecule | `ScrollableContent` | 2 |

### Dead Components (DELETE)

| Layer | Component | Reason |
|-------|-----------|--------|
| Template | `DashboardPage` | Zero usages |
| Template | `MasterDetailLayout` | Zero usages |
| Template | `TabbedPage` | Unify with TabbedContainer |

### Uncertain Components (EVALUATE)

| Layer | Component | Status |
|-------|-----------|--------|
| Organism | `ActionGrid` | Tests only - no production use |
| Organism | `CardGrid` | Tests only - no production use |

---

## 11. Route → Screen → Component Map

```
/                       → (redirect to /home)
/login                  → LoginScreen → CenteredLayout → LoginContent
/callback               → (Auth0 callback handler)
/home                   → HomeScreen → AdaptiveShell → DashboardContent
/settings               → SettingsScreen → AdaptiveShell → SettingsContent
/:entity                → EntityScreen → AdaptiveShell → FilterableDataTable
/:entity/:id            → EntityDetailScreen → AdaptiveShell → ScrollableContent
/admin                  → AdminScreen → AdaptiveShell → AdminHomeContent
/admin/system/health    → _AdminHealthScreen → AdaptiveShell → DbHealthDashboard
/admin/system/logs/:tab → _AdminLogsScreen → AdaptiveShell → TabbedPage
/admin/system/files     → _AdminFilesScreen → AdaptiveShell → TabbedContainer
/admin/:entity          → _AdminEntityScreen → AdaptiveShell → TabbedContainer
/error                  → (Error page)
/unauthorized           → (Unauthorized page)
/not-found              → (404 page)
```

---

## 12. Conclusion

The widget architecture is **well-structured** with consistent patterns. The main opportunities for improvement are:

1. **Remove dead code** - 2 unused templates, potentially 2 unused layout organisms
2. **Unify tabs** - TabbedPage and TabbedContainer are duplicates
3. **Standardize scrolling** - Use ScrollableContent molecule consistently

All changes can be made incrementally with tests passing after each step.

---

*Document generated from comprehensive frontend audit on January 30, 2026*
