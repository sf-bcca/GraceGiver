-- =============================================================================
-- GraceGiver Test Data Seeding
-- =============================================================================
-- Seeds test users and members for automated browser testing.
-- Run this AFTER the main init.sql has been executed.
-- =============================================================================

-- Create test users with pre-hashed passwords
-- Password for both: TestPass123!
-- Note: This hash is generated with bcrypt (cost=10) for "TestPass123!"
-- In production, use the bootstrap mechanism; this is only for testing.

-- testuser_a (admin role)
INSERT INTO users (username, password_hash, email, role, must_change_password)
VALUES (
  'testuser_a',
  '$2a$10$Y4c6L3ggFeVSxulXUozf2uyifdAEAGN6PIFUZ23RS8Ses2flA1AXu',
  'testuser_a@test.com',
  'admin',
  false
) ON CONFLICT (username) DO NOTHING;

-- testuser_b (admin role)
INSERT INTO users (username, password_hash, email, role, must_change_password)
VALUES (
  'testuser_b',
  '$2a$10$Y4c6L3ggFeVSxulXUozf2uyifdAEAGN6PIFUZ23RS8Ses2flA1AXu',
  'testuser_b@test.com',
  'admin',
  false
) ON CONFLICT (username) DO NOTHING;

-- Create a test member for lock testing
INSERT INTO members (id, first_name, last_name, email, telephone, address, city, state, zip, created_at)
VALUES (
  'test-member-001',
  'Lock',
  'TestMember',
  'lock.test@example.com',
  '+15551234567',
  '123 Lock Test Lane',
  'Testville',
  'TX',
  '75001',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Test data seeding complete: testuser_a, testuser_b, and test-member-001 created.';
END $$;
