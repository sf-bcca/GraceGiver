/**
 * Bootstrap Module - Super Admin Initialization
 * 
 * This module handles the automatic creation of a super admin user on first
 * application startup when no users exist in the database.
 * 
 * Security Features:
 * - Creates super admin only if no users exist (fresh installation)
 * - Uses environment variables for credentials (recommended for production)
 * - Generates random password if none provided (logged once to console)
 * - Forces password change on first login
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Bootstrap the initial super admin user
 * 
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<boolean>} - True if a new super admin was created
 */
async function bootstrapSuperAdmin(pool) {
  try {
    // Check if ANY users exist in the database
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(userCount.rows[0].count) > 0) {
      // Users already exist - no bootstrap needed
      return false;
    }

    // No users exist - this is a fresh installation
    console.log('\n' + '='.repeat(60));
    console.log('🔐 FIRST-TIME SETUP: Creating initial super admin');
    console.log('='.repeat(60));

    const username = process.env.INITIAL_ADMIN_USERNAME || 'superadmin';
    const providedPassword = process.env.INITIAL_ADMIN_PASSWORD;
    
    let password;
    let passwordSource;

    if (providedPassword && providedPassword.length >= 12) {
      // Use the password from environment variables
      password = providedPassword;
      passwordSource = 'environment';
    } else if (providedPassword && providedPassword.length < 12) {
      // Password provided but too short - reject and generate
      console.log('⚠️  INITIAL_ADMIN_PASSWORD is less than 12 characters.');
      console.log('    Generating a secure random password instead.');
      password = crypto.randomBytes(16).toString('base64');
      passwordSource = 'generated';
    } else {
      // No password provided - generate a secure random one
      password = crypto.randomBytes(16).toString('base64');
      passwordSource = 'generated';
    }

    // Hash the password with work factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert the super admin user
    await pool.query(`
      INSERT INTO users (username, password_hash, role, must_change_password)
      VALUES ($1, $2, 'super_admin', true)
    `, [username, passwordHash]);

    // Log credentials (only for generated passwords)
    if (passwordSource === 'generated') {
      console.log('\n' + '⚠️'.repeat(30));
      console.log('\n🔑 INITIAL SUPER ADMIN CREDENTIALS:');
      console.log('='.repeat(60));
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log('='.repeat(60));
      console.log('\n⚠️  IMPORTANT: Save this password NOW!');
      console.log('⚠️  It will NOT be displayed again.');
      console.log('⚠️  You will be required to change it on first login.');
      console.log('\n' + '⚠️'.repeat(30) + '\n');
    } else {
      console.log(`✅ Super admin '${username}' created from environment variables.`);
      console.log('   You will be required to change the password on first login.');
    }

    console.log('='.repeat(60) + '\n');

    return true;
  } catch (error) {
    console.error('❌ Failed to bootstrap super admin:', error.message);
    throw error;
  }
}

/**
 * Validate password meets minimum security requirements
 * 
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validatePasswordPolicy(password) {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  bootstrapSuperAdmin,
  validatePasswordPolicy
};
