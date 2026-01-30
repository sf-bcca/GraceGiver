-- Migration: <DESCRIPTION>
-- Created: <TIMESTAMP>

-- Start Migration
BEGIN;

-- 1. Schema Changes (Add tables, columns, indexes)
-- ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name DATA_TYPE;

-- 2. Data Changes (Seeding or updating existing records)
-- INSERT INTO table_name (...) VALUES (...) ON CONFLICT (...) DO NOTHING;

-- 3. Triggers (If applicable)
-- DROP TRIGGER IF EXISTS update_<TABLE>_updated_at ON <TABLE>;
-- CREATE TRIGGER update_<TABLE>_updated_at ...

COMMIT;
-- End Migration

SELECT 'Migration completed successfully!' as status;
