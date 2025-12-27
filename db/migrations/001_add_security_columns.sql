-- Migration: Add security columns to existing users table
-- Run this on existing databases to add the new security features

-- Add security-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('super_admin', 'Full system access', '["*"]'),
    ('admin', 'User management and all data operations', '["users:read", "users:write", "members:*", "donations:*", "reports:*"]'),
    ('manager', 'Reports and member/donation management', '["members:*", "donations:*", "reports:read", "reports:export"]'),
    ('data_entry', 'Add and edit members and donations', '["members:create", "members:update", "members:read", "donations:create", "donations:update", "donations:read"]'),
    ('viewer', 'Read-only access', '["members:read", "donations:read", "reports:read"]')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Force password change for existing users (security measure)
UPDATE users SET must_change_password = true WHERE must_change_password IS NULL;

-- Upgrade existing admin to super_admin
UPDATE users SET role = 'super_admin' WHERE username = 'admin' AND role = 'admin';

SELECT 'Migration completed successfully!' as status;
