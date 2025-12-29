const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function migrate() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Checking if joined_at column exists...');
    const checkRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='members' AND column_name='joined_at'
    `);

    if (checkRes.rows.length === 0) {
      console.log('Adding joined_at column...');
      await client.query('ALTER TABLE members ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE');
      console.log('Column added successfully.');
    } else {
      console.log('Column joined_at already exists.');
    }

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
