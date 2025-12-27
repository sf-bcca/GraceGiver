#!/usr/bin/env node
/**
 * Direct database migration - adds security columns
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  });

  console.log('🔧 Running direct database migration...\n');

  const statements = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
  ];

  try {
    for (const sql of statements) {
      try {
        await pool.query(sql);
        console.log('✅', sql.substring(0, 60) + '...');
      } catch (err) {
        console.log('⚠️ ', err.message);
      }
    }

    // Create roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Roles table created/verified');

    // Seed roles
    await pool.query(`
      INSERT INTO roles (name, description, permissions) VALUES
        ('super_admin', 'Full system access', '["*"]'),
        ('admin', 'User management and all data operations', '["users:read", "users:write", "members:*", "donations:*", "reports:*"]'),
        ('manager', 'Reports and member/donation management', '["members:*", "donations:*", "reports:read", "reports:export"]'),
        ('data_entry', 'Add and edit members and donations', '["members:create", "members:update", "members:read", "donations:create", "donations:update", "donations:read"]'),
        ('viewer', 'Read-only access', '["members:read", "donations:read", "reports:read"]')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default roles seeded');

    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 Users table columns:');
    console.table(columns.rows);

    // Show users
    const users = await pool.query('SELECT id, username, role, must_change_password, failed_login_attempts FROM users');
    console.log('\n👤 Current users:');
    console.table(users.rows);

    console.log('\n✅ Migration completed successfully!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
