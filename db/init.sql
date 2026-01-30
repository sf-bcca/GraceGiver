-- =============================================================================
-- GraceGiver Database Schema
-- =============================================================================
-- This file initializes the database schema for GraceGiver.
-- Security Note: No hardcoded credentials are included in this file.
-- Initial admin users are created via the bootstrap mechanism on first startup.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Users Table (Enhanced for Security)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'viewer',
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    
    -- Password management
    must_change_password BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password_history JSONB DEFAULT '[]',
    
    -- Account lockout
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Roles Table (for RBAC - Phase 3)
-- -----------------------------------------------------------------------------
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
    ('viewer', 'Personal profile management and giving history', '["members:read:own", "members:update:own", "donations:read:own", "reports:read:own"]')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Members Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    family_id TEXT,
    skills TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Ministry Opportunities Table (ServantHeart)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ministry_opportunities (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'open', -- 'open', 'filled', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Donations Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    fund TEXT NOT NULL,
    notes TEXT,
    entered_by TEXT,
    donation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Fund Campaigns Table (CommunityBridge)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fund_campaigns (
    id SERIAL PRIMARY KEY,
    fund_name TEXT NOT NULL, -- Ties to the 'fund' column in donations
    title TEXT NOT NULL,
    description TEXT,
    goal_amount DECIMAL(12,2) NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed some initial campaigns based on common church funds
INSERT INTO fund_campaigns (fund_name, title, description, goal_amount) VALUES
('Upkeep', 'Roof Restoration Project', 'Critical repairs for the main sanctuary roof.', 25000.00),
('Church School', 'Youth Mission Trip 2024', 'Supporting our youth program outreach.', 5000.00)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Indexes for Performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_members_last_name ON members(last_name);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);
CREATE INDEX IF NOT EXISTS idx_members_skills ON members USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_members_interests ON members USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_fund ON donations(fund);
CREATE INDEX IF NOT EXISTS idx_fund_campaigns_fund ON fund_campaigns (fund_name);

-- -----------------------------------------------------------------------------
-- NOTE: Initial Admin User
-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- Settings Table
-- -----------------------------------------------------------------------------
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

-- Seed initial settings
INSERT INTO settings (name, address, phone, email, tax_id)
VALUES ('Mt. Herman A.M.E. Church', '123 Main St, Anytown, ST 12345', '(555) 123-4567', 'office@mthermaname.org', '12-3456789')
ON CONFLICT (singleton_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Export Logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS export_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    export_type TEXT NOT NULL,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- The initial super admin user is NOT created here.
-- It is automatically created on first application startup via the
-- bootstrap mechanism in server/bootstrap.js
-- 
-- Options:
-- 1. Set INITIAL_ADMIN_PASSWORD in environment to use a specific password
-- 2. Leave it unset to have a random password generated and logged once
-- 3. Use the CLI tool: node scripts/create-superadmin.js
-- -----------------------------------------------------------------------------
