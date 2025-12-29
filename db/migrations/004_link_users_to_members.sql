-- Migration: 004_link_users_to_members
-- Description: Adds a member_id column to the users table to allow linking users to their member records.
-- Author: Cybersecurity Architect

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS member_id TEXT REFERENCES members(id) ON DELETE SET NULL;

-- Index for performance when joining users to members
CREATE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);

-- Optional: Migrate existing logic? No, current users are admin/super_admin/manager by default.
-- New members that sign up will need this link established during account creation.
