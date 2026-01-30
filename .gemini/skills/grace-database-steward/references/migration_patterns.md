# Migration Patterns for GraceGiver

Follow these patterns to ensure migrations are idempotent and safe to run multiple times.

## 1. Naming Convention
- Files must be located in `db/migrations/`.
- Format: `XXX_description.sql` (e.g., `006_add_volunteer_skills.sql`).
- Increment the sequence number based on the highest existing migration.

## 2. Idempotency (Safety)
Always use `IF NOT EXISTS` or check for existence before modifying the schema.

### Adding a Table
```sql
CREATE TABLE IF NOT EXISTS my_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);
```

### Adding a Column
```sql
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS my_column TEXT;
```

### Creating an Index
```sql
CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);
```

## 3. updated_at Triggers
If a table requires an `updated_at` column, follow this pattern:

### Step A: Ensure the update function exists
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Step B: Apply the trigger to the table
```sql
-- Ensure the column exists
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_my_table_updated_at ON my_table;
CREATE TRIGGER update_my_table_updated_at
    BEFORE UPDATE ON my_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 4. Seeding Data
Use `ON CONFLICT` to avoid duplicate rows.
```sql
INSERT INTO roles (name, description)
VALUES ('new_role', 'Description here')
ON CONFLICT (name) DO NOTHING;
```

## 5. Baseline Updates
When a migration is finalized, the changes SHOULD be manually reflected in `db/init.sql` to ensure new installations are up-to-date.
