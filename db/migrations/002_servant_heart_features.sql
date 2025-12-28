-- Migration: Add ServantHeart features (Skills, Interests, Ministry Opportunities)

-- Add skills and interests to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE members ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Create ministry_opportunities table
CREATE TABLE IF NOT EXISTS ministry_opportunities (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'open', -- 'open', 'filled', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for skill searching
CREATE INDEX IF NOT EXISTS idx_members_skills ON members USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_members_interests ON members USING GIN (interests);
