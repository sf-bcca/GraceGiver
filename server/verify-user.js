const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('5432', '5433') || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:5433/${process.env.DB_NAME}`
});

async function verifyUser() {
  try {
    const res = await pool.query('SELECT username, role, member_id FROM users WHERE username = $1', ['viewertest']);
    if (res.rows.length === 0) {
      console.log('User "viewertest" NOT FOUND in database.');
    } else {
      console.log('User found:', res.rows[0]);
    }
  } catch (err) {
    console.error('Error verifying user:', err);
  } finally {
    await pool.end();
  }
}

verifyUser();
