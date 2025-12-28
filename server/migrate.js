const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../db/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log('🚀 Starting database migrations...');

  try {
    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      
      console.log(`\n📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✅ ${file} completed successfully.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error in ${file}:`, err.message);
        // Don't exit, try next one (unless it's a fatal connection error)
      } finally {
        client.release();
      }
    }
    console.log('\n✨ All migrations finished.');
  } catch (err) {
    console.error('💥 Migration process failed:', err);
  } finally {
    await pool.end();
  }
}

runMigrations();
