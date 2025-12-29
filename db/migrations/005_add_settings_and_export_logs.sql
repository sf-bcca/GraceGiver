-- Migration: Add missing settings and export_logs tables
-- These were originally in init.sql but missing from existing production databases.

CREATE TABLE IF NOT EXISTS settings (
    singleton_id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (singleton_id)
);

-- Seed initial settings if they don't exist
INSERT INTO settings (name, address, phone, email, tax_id)
VALUES ('Mt. Herman A.M.E. Church', '123 Main St, Anytown, ST 12345', '(555) 123-4567', 'office@mthermaname.org', '12-3456789')
ON CONFLICT (singleton_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS export_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    export_type TEXT NOT NULL,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
