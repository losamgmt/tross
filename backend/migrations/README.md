# Database Migrations

Database schema evolution using SQL migration files.

## Current Migrations

- `000_create_migrations_table.sql` - Migration tracking system
- `001_add_system_level_fields.sql` - TIER 1+2 audit fields
- `003_add_role_priority.sql` - Role hierarchy system
- `004_make_audit_logs_user_id_nullable.sql` - System-level audit logging
- `005_add_deactivation_audit_fields.sql` - Soft delete tracking
- `006_add_performance_indexes.sql` - Database optimization
- `007_add_user_status_field.sql` - User lifecycle states
- `008_add_work_order_schema.sql` - Work order entity

## Running Migrations

```bash
npm run db:migrate
```

## Migration Naming

Format: `NNN_description.sql`
- Sequential numbering (000, 001, 002...)
- Snake_case description
- Descriptive, actionable name

## Migration Structure

Each migration includes:
- **UP**: Schema changes to apply
- **DOWN**: Rollback instructions (in comments)
- **Idempotency**: Safe to re-run

## See Also

- [Database Architecture](../../docs/architecture/DATABASE_ARCHITECTURE.md) - Entity Contract v2.0
- [Entity Lifecycle](../../docs/architecture/ENTITY_LIFECYCLE.md) - Status patterns
