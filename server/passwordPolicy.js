/**
 * Password Policy Module
 * 
 * Configurable password validation and policy enforcement.
 * All settings can be overridden via environment variables.
 * 
 * Environment Variables:
 * - PASSWORD_MIN_LENGTH: Minimum password length (default: 12)
 * - PASSWORD_REQUIRE_UPPERCASE: Require uppercase letter (default: true)
 * - PASSWORD_REQUIRE_LOWERCASE: Require lowercase letter (default: true)
 * - PASSWORD_REQUIRE_DIGIT: Require digit (default: true)
 * - PASSWORD_REQUIRE_SPECIAL: Require special character (default: true)
 * - PASSWORD_EXPIRY_DAYS: Days before password expires (0 = never, default: 0)
 * - PASSWORD_HISTORY_COUNT: Prevent reusing last N passwords (default: 5)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuration with environment variable overrides
const config = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 12,
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireDigit: process.env.PASSWORD_REQUIRE_DIGIT !== 'false',
  requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
  expiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 0, // 0 = disabled
  historyCount: parseInt(process.env.PASSWORD_HISTORY_COUNT) || 5
};

/**
 * Validate password against policy
 * 
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[], strength: number }
 */
function validatePasswordPolicy(password) {
  const errors = [];
  let strength = 0;

  if (!password) {
    return { valid: false, errors: ['Password is required'], strength: 0 };
  }

  // Length check
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  } else {
    strength += 1;
    if (password.length >= 16) strength += 1;
    if (password.length >= 20) strength += 1;
  }

  // Uppercase check
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    strength += 1;
  }

  // Lowercase check
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    strength += 1;
  }

  // Digit check
  if (config.requireDigit && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  } else if (/[0-9]/.test(password)) {
    strength += 1;
  }

  // Special character check
  if (config.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    strength += 1;
  }

  // Calculate strength score (0-10)
  const maxStrength = 7;
  const strengthPercent = Math.min(100, Math.round((strength / maxStrength) * 100));

  return {
    valid: errors.length === 0,
    errors,
    strength: strengthPercent,
    strengthLabel: getStrengthLabel(strengthPercent)
  };
}

/**
 * Get human-readable strength label
 */
function getStrengthLabel(percent) {
  if (percent < 30) return 'Weak';
  if (percent < 50) return 'Fair';
  if (percent < 70) return 'Good';
  if (percent < 90) return 'Strong';
  return 'Excellent';
}

/**
 * Check if password has expired
 * 
 * @param {Date} passwordChangedAt - When password was last changed
 * @returns {object} - { expired: boolean, daysRemaining: number, expiryEnabled: boolean }
 */
function checkPasswordExpiry(passwordChangedAt) {
  // If expiry is disabled (0 days), password never expires
  if (config.expiryDays === 0) {
    return { 
      expired: false, 
      daysRemaining: null, 
      expiryEnabled: false 
    };
  }

  if (!passwordChangedAt) {
    return { 
      expired: true, 
      daysRemaining: 0, 
      expiryEnabled: true 
    };
  }

  const changedDate = new Date(passwordChangedAt);
  const expiryDate = new Date(changedDate);
  expiryDate.setDate(expiryDate.getDate() + config.expiryDays);
  
  const now = new Date();
  const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

  return {
    expired: daysRemaining <= 0,
    daysRemaining: Math.max(0, daysRemaining),
    expiryEnabled: true,
    expiresAt: expiryDate
  };
}

/**
 * Get current password policy configuration
 * (useful for sending to frontend)
 */
function getPasswordPolicy() {
  return {
    minLength: config.minLength,
    requireUppercase: config.requireUppercase,
    requireLowercase: config.requireLowercase,
    requireDigit: config.requireDigit,
    requireSpecial: config.requireSpecial,
    expiryDays: config.expiryDays,
    expiryEnabled: config.expiryDays > 0,
    historyCount: config.historyCount
  };
}

module.exports = {
  validatePasswordPolicy,
  checkPasswordExpiry,
  getPasswordPolicy,
  config
};
