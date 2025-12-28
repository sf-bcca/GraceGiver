-- Migration: Add CommunityBridge features (Fund Campaigns & Goals)

-- Create fund_campaigns table
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

-- Index for campaign lookup by fund
CREATE INDEX IF NOT EXISTS idx_fund_campaigns_fund ON fund_campaigns (fund_name);

-- Seed some initial campaigns based on common church funds
INSERT INTO fund_campaigns (fund_name, title, description, goal_amount) VALUES
('Upkeep', 'Roof Restoration Project', 'Critical repairs for the main sanctuary roof.', 25000.00),
('Church School', 'Youth Mission Trip 2024', 'Supporting our youth program outreach.', 5000.00)
ON CONFLICT DO NOTHING;
