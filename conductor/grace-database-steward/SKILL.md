---
name: grace-database-steward
description: Automates and validates PostgreSQL migrations for GraceGiver. Use when you need to create new database migrations, validate schema changes, or ensure idempotency in database scripts.
---

# grace-database-steward

This skill provides tools and guidance for managing the GraceGiver PostgreSQL schema.

## Core Workflows

### 1. Create a New Migration
When asked to add a column, table, or change the schema, use the generation script:

```bash
node conductor/grace-database-steward/scripts/generate_migration.cjs "add_middle_name_to_members"
```

### 2. Migration Best Practices
Follow the patterns defined in [references/migration_patterns.md](references/migration_patterns.md):
- Use `IF NOT EXISTS` for tables and columns.
- Use `ON CONFLICT DO NOTHING` for seeding data.
- Ensure `updated_at` triggers are correctly applied using the standard function.

### 3. Baseline Sync
After adding a migration, verify if the changes should be added to `db/init.sql`. New installations rely on `db/init.sql` being the source of truth for the complete schema.

## Resource Navigation
- **Templates**: [assets/migration_template.sql](assets/migration_template.sql)
- **Patterns**: [references/migration_patterns.md](references/migration_patterns.md)
- **Script**: `conductor/grace-database-steward/scripts/generate_migration.cjs`