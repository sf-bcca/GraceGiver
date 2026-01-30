const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('5432', '5433') || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:5433/${process.env.DB_NAME}`
});

async function checkSchemaAndSeed() {
  try {
    // 1. Check if column exists
    const colCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='member_id';
    `);

    if (colCheck.rows.length === 0) {
      console.log('member_id column missing. Applying migration 004...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS member_id TEXT REFERENCES members(id) ON DELETE SET NULL;
      `);
    }

    const username = 'viewertest';
    const password = 'ViewerPass123!';
    const memberId = 'test-member-001';
    
    const hash = await bcrypt.hash(password, 12);
    
    await pool.query(`
      INSERT INTO members (id, first_name, last_name, email, telephone, address, city, state, zip)
      VALUES ($1, 'Test', 'Member', 'viewer@example.com', '555-0199', '123 Viewer St', 'Test City', 'TX', '75001')
      ON CONFLICT (id) DO NOTHING
    `, [memberId]);

    // Check if user exists
    const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userRes.rows.length > 0) {
      await pool.query('UPDATE users SET password_hash = $1, role = $2, member_id = $3 WHERE username = $4', [hash, 'viewer', memberId, username]);
    } else {
      await pool.query('INSERT INTO users (username, password_hash, role, member_id, must_change_password) VALUES ($1, $2, $3, $4, false)', [username, hash, 'viewer', memberId]);
    }

    // Add sample donations
    const donations = [
      { amount: 100, fund: 'Tithes', date: '2026-01-15', notes: 'Monthly Tithe' },
      { amount: 50, fund: 'Building', date: '2026-01-20', notes: 'Building Fund' },
      { amount: 25, fund: 'Missions', date: '2025-12-10', notes: 'Christmas Mission' }
    ];

    for (const d of donations) {
      await pool.query(`
        INSERT INTO donations (member_id, amount, fund, donation_date, notes, entered_by)
        VALUES ($1, $2, $3, $4, $5, 'system_seed')
      `, [memberId, d.amount, d.fund, d.date, d.notes]);
    }

    console.log('Successfully created viewer user:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkSchemaAndSeed();