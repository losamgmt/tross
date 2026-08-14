# Database Migrations

Forward-only, **data-preserving** schema evolution — the `migrate` deployment strategy. For how this relates to the default `rebuild` strategy and how to switch between them, see [DEPLOYMENT.md → Database Schema & Migrations](../../docs/operations/DEPLOYMENT.md).

## How it works

- Each migration is a numbered SQL file (`NNN_description.sql`) applied **once**, in order.
- Applied migrations are tracked in the `schema_migrations` table (`000_create_migrations_table.sql`) by their 3-digit `version` (e.g. `001`), name, checksum, and timestamp.
- Each migration runs in its own transaction (rollback on error).
- The unified deploy tool (`scripts/deploy-db.js --strategy=migrate`) bootstraps a fresh database to the current schema and **baselines** these migrations, so the same command works on both a new and an existing database.

## Commands

```bash
npm run db:migrate                        # apply all pending migrations
npm run db:migrate:status                 # show applied vs pending
node scripts/run-migrations.js --dry-run  # preview without applying
node scripts/run-migrations.js --verify   # detect edits to applied migrations (checksums)
```

## Authoring a migration

Format: `NNN_description.sql`

- Sequential 3-digit prefix (`001`, `002`, …) — this becomes the tracked `version`.
- Snake_case, descriptive, actionable name.
- **Idempotent**: use `IF [NOT] EXISTS` / guards so a re-run is safe.
- Include the rollback as a comment (`-- DOWN: …`).
- Never edit a migration after it has been applied — add a new one (the checksum check flags drift).

## See Also

- [DEPLOYMENT.md](../../docs/operations/DEPLOYMENT.md) — rebuild vs migrate strategies, go-live switch
- [DATABASE_ARCHITECTURE.md](../../docs/architecture/DATABASE_ARCHITECTURE.md) — Entity Contract v2.0
- [ENTITY_LIFECYCLE.md](../../docs/architecture/ENTITY_LIFECYCLE.md) — `is_active` vs `status` patterns
