-- Refined schema for GraceGiver

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    family_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    fund TEXT NOT NULL,
    notes TEXT,
    entered_by TEXT,
    donation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_last_name ON members(last_name);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON donations(member_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_fund ON donations(fund);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);

-- Seed initial admin user (password: admin123)
INSERT INTO users (username, password_hash)
VALUES ('admin', '$2a$10$DYM11byUyWEmug5lXHFBo.pPUF/TzC3FwucwNXSeUBnoZ6uayeFGG')
ON CONFLICT (username) DO NOTHING;
