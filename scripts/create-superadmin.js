#!/usr/bin/env node
/**
 * GraceGiver Super Admin CLI Tool
 * 
 * Interactive script for creating or recovering super admin access.
 * Can be run directly or via Docker exec.
 * 
 * Usage:
 *   node scripts/create-superadmin.js                    # Interactive mode
 *   node scripts/create-superadmin.js -u admin -p pass   # Non-interactive
 *   docker exec -it gracegiver-api node scripts/create-superadmin.js
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Password policy validation
function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-u' || args[i] === '--username') {
      options.username = args[++i];
    } else if (args[i] === '-p' || args[i] === '--password') {
      options.password = args[++i];
    } else if (args[i] === '-h' || args[i] === '--help') {
      options.help = true;
    } else if (args[i] === '--force') {
      options.force = true;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
🔐 GraceGiver Super Admin CLI Tool

Usage:
  node scripts/create-superadmin.js [options]

Options:
  -u, --username <name>   Username for the super admin
  -p, --password <pass>   Password for the super admin
  --force                 Overwrite existing user if it exists
  -h, --help              Show this help message

Examples:
  # Interactive mode
  node scripts/create-superadmin.js

  # Non-interactive mode
  node scripts/create-superadmin.js -u admin -p "SecurePass123!"

  # Via Docker
  docker exec -it gracegiver-api node scripts/create-superadmin.js

Password Requirements:
  - Minimum 12 characters
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
  - At least one special character (!@#$%^&*...)
`);
}

async function createSuperAdmin() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Build database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  });

  console.log('\n' + '='.repeat(50));
  console.log('🔐 GraceGiver Super Admin Setup');
  console.log('='.repeat(50) + '\n');

  let username, password;

  // Non-interactive mode
  if (options.username && options.password) {
    username = options.username;
    password = options.password;
  } else {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    try {
      username = await question('Enter username: ');
      
      if (!username || username.length < 3) {
        console.error('\n❌ Username must be at least 3 characters\n');
        rl.close();
        await pool.end();
        process.exit(1);
      }

      // Check if user already exists
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing.rows.length > 0 && !options.force) {
        console.error(`\n❌ User '${username}' already exists.`);
        console.error('   Use --force to overwrite.\n');
        rl.close();
        await pool.end();
        process.exit(1);
      }

      password = await question('Enter password (min 12 chars): ');
      const confirmPassword = await question('Confirm password: ');

      if (password !== confirmPassword) {
        console.error('\n❌ Passwords do not match\n');
        rl.close();
        await pool.end();
        process.exit(1);
      }

      rl.close();
    } catch (err) {
      console.error('\n❌ Input error:', err.message);
      rl.close();
      await pool.end();
      process.exit(1);
    }
  }

  // Validate password policy
  const validation = validatePassword(password);
  if (!validation.valid) {
    console.error('\n❌ Password does not meet security requirements:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    console.error('');
    await pool.end();
    process.exit(1);
  }

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert or update the super admin
    const query = options.force 
      ? `
        INSERT INTO users (username, password_hash, role, must_change_password)
        VALUES ($1, $2, 'super_admin', false)
        ON CONFLICT (username) DO UPDATE SET 
          password_hash = EXCLUDED.password_hash,
          role = 'super_admin',
          must_change_password = false
        RETURNING id
      `
      : `
        INSERT INTO users (username, password_hash, role, must_change_password)
        VALUES ($1, $2, 'super_admin', false)
        RETURNING id
      `;

    const result = await pool.query(query, [username, passwordHash]);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Super admin '${username}' created successfully!`);
    console.log(`   User ID: ${result.rows[0].id}`);
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    if (err.code === '23505') {
      console.error(`\n❌ User '${username}' already exists. Use --force to overwrite.\n`);
    } else {
      console.error('\n❌ Database error:', err.message);
    }
    await pool.end();
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

// Handle uncaught errors gracefully
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled error:', err.message);
  process.exit(1);
});

createSuperAdmin();
