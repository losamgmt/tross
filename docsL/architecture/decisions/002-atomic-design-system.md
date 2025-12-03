# ADR 002: Atomic Design System

**Status:** ✅ Accepted  
**Deciders:** Development Team

---

## Context

Flutter widgets can quickly become a tangled mess without clear organization:

- Nested widget trees 10+ levels deep
- Copy-pasted UI code across screens
- Inconsistent styling and spacing
- Difficult to test individual components
- Hard to find and reuse widgets

We needed a **component organization system** that:

1. Promotes reusability
2. Enforces consistent design
3. Makes testing easier
4. Scales with app growth
5. New developers understand structure

---

## Decision

We adopted **Atomic Design** methodology with Flutter-specific adaptations:

```
widgets/
├── atoms/           # Smallest components (buttons, icons, text)
├── molecules/       # Simple groups (cards, search bars)
├── organisms/       # Complex components (data tables, headers)
└── screens/         # Full pages (home, login, admin)
```

### Hierarchy Rules

**Atoms (20 components)**

- Single-purpose, no dependencies
- Examples: `ActionButton`, `StatusBadge`, `DataValue`
- Cannot import from molecules/organisms

**Molecules (15 components)**

- Composed of 2-5 atoms
- Examples: `ErrorCard`, `PaginationControls`, `TableHeader`
- Can import atoms only

**Organisms (8 components)**

- Complex, feature-complete components
- Examples: `AppDataTable<T>`, `AppHeader`, `ErrorDisplay`
- Can import atoms + molecules

**Screens (5 pages)**

- Full page layouts
- Examples: `LoginScreen`, `HomeScreen`, `AdminDashboard`
- Can import all lower levels

---

## Example: Building a Data Table

**Atom:** `ColumnHeader` (sorting icon + text)

```dart
class ColumnHeader extends StatelessWidget {
  final String label;
  final bool sortable;
}
```

**Molecule:** `TableHeader` (row of column headers)

```dart
class TableHeader<T> extends StatelessWidget {
  final List<TableColumn<T>> columns;
  // Uses multiple ColumnHeader atoms
}
```

**Organism:** `AppDataTable<T>` (complete table)

```dart
class AppDataTable<T> extends StatefulWidget {
  // Composes:
  // - TableToolbar (molecule)
  // - TableHeader (molecule)
  // - TableBody (molecule)
  // - PaginationControls (molecule)
  // - EmptyState (molecule)
}
```

**Screen:** `AdminDashboard` (page with tables)

```dart
class AdminDashboard extends StatelessWidget {
  // Uses AppDataTable<User>, AppDataTable<Role>
}
```

---

## Alternatives Considered

### Flat Widget Structure

```
widgets/
├── action_button.dart
├── error_card.dart
├── data_table.dart
└── ... (100+ files)
```

- **Pros:** Simple, no hierarchy
- **Cons:** Impossible to navigate, no reuse patterns
- **Decision:** Doesn't scale

### Feature-Based Structure

```
widgets/
├── auth/
├── admin/
└── dashboard/
```

- **Pros:** Clear feature ownership
- **Cons:** Duplicate components, inconsistent UI
- **Decision:** Causes code duplication

### BLoC Pattern Components

```
widgets/
├── presentational/
└── containers/
```

- **Pros:** Separates logic from UI
- **Cons:** Not a sizing/reuse pattern
- **Decision:** Orthogonal concern (we use Provider)

---

## Consequences

### Positive ✅

- **Findability:** Developers know exactly where components live
- **Reusability:** 90% of UI built from <50 atoms/molecules
- **Consistency:** Design system enforced through hierarchy
- **Testing:** Test atoms individually, compose for integration tests
- **Onboarding:** New developers understand structure in minutes

### Metrics 📊

- **Atoms:** 20 (buttons, icons, typography, badges)
- **Molecules:** 15 (cards, toolbars, search, pagination)
- **Organisms:** 8 (tables, headers, error displays, dashboards)
- **Screens:** 5 (login, home, admin, settings, health)
- **Code Reuse:** ~87% of screen UI is composed components

### Negative ⚠️

- **Learning Curve:** Developers must understand hierarchy
- **File Navigation:** More folders to navigate
- **Import Paths:** Longer paths (`../../atoms/buttons/action_button.dart`)

### Mitigations 🛡️

- Created barrel exports (`atoms/atoms.dart`, `molecules/molecules.dart`)
- Documented hierarchy in `frontend/README.md`
- VS Code workspace favorites for quick access
- Code review enforces proper placement

---

## Implementation Details

### Directory Structure

```
lib/widgets/
├── atoms/
│   ├── atoms.dart           # Barrel export
│   ├── avatars/
│   ├── branding/
│   ├── buttons/
│   ├── icons/
│   ├── indicators/
│   ├── text/
│   ├── typography/
│   └── user_info/
├── molecules/
│   ├── molecules.dart       # Barrel export
│   ├── cards/
│   ├── data_cell.dart
│   ├── error_card.dart
│   ├── pagination_controls.dart
│   └── ...
├── organisms/
│   ├── organisms.dart       # Barrel export
│   ├── app_header.dart
│   ├── data_table.dart
│   ├── error_display.dart
│   └── dashboards/
├── forms/                   # Special: form widgets
└── helpers/                 # Special: utilities (AsyncDataWidget)
```

### Import Best Practices

```dart
// ✅ Good: Use barrel exports
import '../atoms/atoms.dart';
import '../molecules/molecules.dart';

// ❌ Bad: Deep imports
import '../atoms/buttons/action_button.dart';
import '../atoms/icons/error_icon.dart';
```

---

## Validation

**Test Coverage:**

- ✅ Each atom tested individually (~20 test files)
- ✅ Molecules tested with mocked atoms (~15 test files)
- ✅ Organisms tested with integration tests (~8 test files)
- ✅ Screens tested with full widget tree (~5 test files)

**Design Consistency:**

- ✅ All components use `AppTheme`, `AppColors`, `AppSpacing`
- ✅ Material 3 design system enforced
- ✅ TrossApp branding consistent across all levels

---

## References

- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [Flutter Widget Composition](https://docs.flutter.dev/ui/widgets)
- Implementation: `frontend/lib/widgets/`
- Config: `frontend/lib/config/` (theme, colors, spacing)

---

**Last Reviewed:** October 27, 2025  
**Status:** Active, working excellently
