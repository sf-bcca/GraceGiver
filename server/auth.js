/**
 * Authentication Module - JWT Token Management
 * 
 * Handles JWT token generation and verification for API authentication.
 * Security features:
 * - Environment-based JWT secret (no hardcoding)
 * - Token expiration (24h default, configurable)
 * - Role-based claims for RBAC
 */

const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables FIRST
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// SECURITY: JWT secret MUST be provided via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Validate JWT secret on module load
if (!JWT_SECRET) {
  console.error('='.repeat(60));
  console.error('❌ CRITICAL SECURITY ERROR');
  console.error('='.repeat(60));
  console.error('JWT_SECRET environment variable is not set!');
  console.error('This is required for secure token signing.');
  console.error('');
  console.error('Set it in your .env file or environment:');
  console.error('  JWT_SECRET=your-secure-random-string-at-least-32-chars');
  console.error('');
  console.error('Generate one with:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('='.repeat(60));
  
  // In development, warn but continue with a fallback (will still log error)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

// Fallback for development only (with warning)
const SECRET = JWT_SECRET || (() => {
  console.warn('⚠️  WARNING: Using insecure fallback JWT secret for development');
  return 'INSECURE_DEV_SECRET_CHANGE_IN_PRODUCTION';
})();

/**
 * Express middleware to authenticate JWT tokens
 * 
 * Expects: Authorization: Bearer <token>
 * Sets: req.user with decoded token payload
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_TOKEN' 
    });
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED' 
        });
      }
      return res.status(403).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    
    req.user = decoded;
    next();
  });
}

/**
 * Generate a JWT token for an authenticated user
 * 
 * @param {object} user - User object from database
 * @param {number} user.id - User ID
 * @param {string} user.username - Username
 * @param {string} user.role - User role for RBAC
 * @returns {string} - Signed JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role || 'viewer' // Default to least privilege
  };

  return jwt.sign(payload, SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Decode a token without verification (for debugging/logging)
 * 
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

module.exports = {
  authenticateToken,
  generateToken,
  decodeToken,
  JWT_SECRET: SECRET // For tests only - avoid using directly
};
