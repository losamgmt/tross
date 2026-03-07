# Entity Relationship Diagram (ERD)

Conceptual relationships between Tross entities.

> **Column details are NOT shown here.** See `backend/schema.sql` and entity metadata files (`backend/config/models/*-metadata.js`) for the definitive column definitions.

## Visual ERD

```mermaid
erDiagram
    ROLES ||--o{ USERS : "has many"
    USERS ||--o| CUSTOMERS : "has profile"
    USERS ||--o| TECHNICIANS : "has profile"
    USERS ||--o{ AUDIT_LOGS : "creates"
    USERS ||--o{ REFRESH_TOKENS : "has"

    CUSTOMERS ||--o{ WORK_ORDERS : "requests"
    CUSTOMERS ||--o{ INVOICES : "billed to"
    CUSTOMERS ||--o{ CONTRACTS : "signs"
    CUSTOMERS ||--o{ CUSTOMER_UNITS : "owns/occupies"
    CUSTOMERS ||--o{ PROPERTY_ROLES : "has role at"

    PROPERTIES ||--o{ UNITS : "contains"
    PROPERTIES ||--o{ PROPERTY_ROLES : "has roles"

    UNITS ||--o{ CUSTOMER_UNITS : "owned by"
    UNITS ||--o{ ASSETS : "contains"
    UNITS ||--o{ WORK_ORDERS : "location"

    TECHNICIANS ||--o{ WORK_ORDERS : "assigned to"

    WORK_ORDERS ||--o| INVOICES : "generates"
```

## Many-to-Many Relationships

Junction tables enable M:M relationships:

| Junction | Connects | Purpose |
|----------|----------|---------|
| `customer_units` | Customer ↔ Unit | Ownership/occupancy |
| `property_roles` | Customer ↔ Property | Board/management roles |

**API Pattern:** Use `?include=` to load related entities:
```http
GET /api/customers/123?include=units,invoices
GET /api/units?include=customers
```

See [API Documentation](../reference/API.md#including-related-entities) for details.

## Entity Categories

### Business Entities

Core domain entities following Entity Contract v2.0:

- **USERS** - System users with authentication
- **CUSTOMERS** - Service recipients
- **TECHNICIANS** - Service providers
- **WORK_ORDERS** - Service requests
- **INVOICES** - Billing records
- **CONTRACTS** - Service agreements
- **INVENTORY** - Stock management

### Location Entities

Property and unit management:

- **PROPERTIES** - Buildings, complexes, addresses
- **UNITS** - Individual units within properties
- **ASSETS** - Equipment, appliances within units

### Junction Entities

M:M relationship pivot tables:

- **CUSTOMER_UNITS** - Customer ↔ Unit ownership/occupancy
- **PROPERTY_ROLES** - Customer ↔ Property board/management roles

### Reference Entities

Configuration and lookup data:

- **ROLES** - Permission groupings

### System Entities

Internal system tables:

- **AUDIT_LOGS** - Change tracking
- **REFRESH_TOKENS** - Session management

## Relationship Patterns

### User-Profile Pattern

Users can have optional profile associations:

- User → Customer (customer portal access)
- User → Technician (field service access)

This enables role-based views of the same underlying user.

### Ownership Pattern

Business entities reference their owner for RLS:

- Work orders → Customer (requester)
- Work orders → Technician (assignee)
- Invoices → Customer (billable party)

### Audit Pattern

All modifications tracked:

- Resource type + ID identifies the changed entity
- Old/new values capture the delta
- User ID tracks who made the change

## Entity Contract

See [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) for full contract details.

**Key Points:**

- All business entities have `id`, identity field, `is_active`, timestamps
- Workflow entities add `status` field
- Status values defined in entity metadata files

## See Also

- [Database Architecture](DATABASE_ARCHITECTURE.md) - Entity Contract v2.0
- [Entity Lifecycle](ENTITY_LIFECYCLE.md) - Status field patterns
