# Migrations Directory

This directory is reserved for future database migrations.

## Current Approach

We currently use a single `schema.sql` file for database schema management.

## Future Migration Strategy

When the application matures, we will implement a proper migration system using one of:

- **node-pg-migrate** - PostgreSQL migration tool
- **Knex.js** - SQL query builder with migrations
- **db-migrate** - Database migration framework

## Why Empty Now?

- Simple schema management for MVP phase
- Single source of truth in `schema.sql`
- No complex versioning needed yet
- Easy to reset test database

## When to Add Migrations?

Consider adding migrations when:

- Schema changes need to be applied to production incrementally
- Multiple developers need coordinated schema updates
- Rollback capability becomes critical
- Data transformations are required during schema changes
