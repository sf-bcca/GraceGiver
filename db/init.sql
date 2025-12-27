-- Refined schema for GraceGiver

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
    member_id TEXT REFERENCES members(id),
    amount DECIMAL(12, 2) NOT NULL,
    fund TEXT NOT NULL,
    notes TEXT,
    entered_by TEXT,
    donation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed some initial data if needed, or we'll let the user enter it.
