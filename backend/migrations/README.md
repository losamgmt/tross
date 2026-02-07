# Database Migrations

Database schema evolution using SQL migration files.

## Migration Files

> **Note:** Migration files are located in this directory. Run `ls migrations/` to see current files.

The migration system tracks applied migrations in the `schema_migrations` table.

## Running Migrations

```bash
# From backend directory
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
