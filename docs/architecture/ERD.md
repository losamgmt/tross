# Entity Relationship Diagram (ERD)

Database schema relationships for Tross.

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

    TECHNICIANS ||--o{ WORK_ORDERS : "assigned to"

    WORK_ORDERS ||--o| INVOICES : "generates"

    ROLES {
        serial id PK
        varchar name UK
        boolean is_active
        text description
        integer priority
        timestamp created_at
        timestamp updated_at
    }

    USERS {
        serial id PK
        varchar email UK
        varchar auth0_id UK
        varchar first_name
        varchar last_name
        integer role_id FK
        integer customer_profile_id FK
        integer technician_profile_id FK
        boolean is_active
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMERS {
        serial id PK
        varchar email UK
        varchar phone
        varchar company_name
        jsonb billing_address
        jsonb service_address
        boolean is_active
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    TECHNICIANS {
        serial id PK
        varchar license_number UK
        varchar first_name
        varchar last_name
        varchar email
        varchar phone
        decimal hourly_rate
        jsonb certifications
        jsonb skills
        boolean is_active
        varchar status
        varchar availability
        timestamp created_at
        timestamp updated_at
    }

    WORK_ORDERS {
        serial id PK
        varchar title
        text description
        varchar status
        varchar priority
        integer customer_id FK
        integer assigned_technician_id FK
        timestamp scheduled_start
        timestamp scheduled_end
        timestamp completed_at
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    INVOICES {
        serial id PK
        varchar invoice_number UK
        integer customer_id FK
        integer work_order_id FK
        decimal amount
        decimal tax
        decimal total
        varchar status
        date due_date
        timestamp paid_at
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    CONTRACTS {
        serial id PK
        varchar contract_number UK
        integer customer_id FK
        date start_date
        date end_date
        text terms
        decimal value
        varchar billing_cycle
        varchar status
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    INVENTORY {
        serial id PK
        varchar name
        varchar sku UK
        text description
        integer quantity
        integer reorder_level
        decimal unit_cost
        varchar location
        varchar supplier
        varchar status
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    AUDIT_LOGS {
        serial id PK
        varchar resource_type
        integer resource_id
        varchar action
        jsonb old_values
        jsonb new_values
        integer user_id FK
        varchar ip_address
        text user_agent
        varchar result
        text error_message
        timestamp created_at
    }

    REFRESH_TOKENS {
        serial id PK
        integer user_id FK
        uuid token_id
        text token_hash
        timestamp expires_at
        boolean is_active
        timestamp last_used_at
        timestamp revoked_at
        timestamp created_at
    }
```

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
