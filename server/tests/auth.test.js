/**
 * Authentication Module Unit Tests
 * 
 * Tests for JWT token generation, verification, and middleware behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  authenticateToken,
  generateToken,
  decodeToken,
  JWT_SECRET
} from '../auth.js';

// ============================================================================
// generateToken Tests
// ============================================================================
describe('generateToken', () => {
  it('should generate a valid JWT token', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
  });

  it('should include user id in token payload', () => {
    const user = { id: 42, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.id).toBe(42);
  });

  it('should include username in token payload', () => {
    const user = { id: 1, username: 'myuser', role: 'admin' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.username).toBe('myuser');
  });

  it('should include role in token payload', () => {
    const user = { id: 1, username: 'testuser', role: 'manager' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.role).toBe('manager');
  });

  it('should default role to viewer if not provided', () => {
    const user = { id: 1, username: 'testuser' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.role).toBe('viewer');
  });

  it('should include member_id if provided', () => {
    const user = { id: 1, username: 'testuser', role: 'viewer', member_id: 'member-123' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.memberId).toBe('member-123');
  });

  it('should include expiration claim', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should include issued-at claim', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    const decoded = jwt.decode(token);
    
    expect(decoded.iat).toBeDefined();
    expect(decoded.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });
});

// ============================================================================
// decodeToken Tests
// ============================================================================
describe('decodeToken', () => {
  it('should decode a valid token', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    
    const decoded = decodeToken(token);
    
    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe('testuser');
  });

  it('should return null for invalid token', () => {
    const decoded = decodeToken('not-a-valid-token');
    
    expect(decoded).toBeNull();
  });

  it('should return null for null input', () => {
    const decoded = decodeToken(null);
    
    expect(decoded).toBeNull();
  });

  it('should return null for undefined input', () => {
    const decoded = decodeToken(undefined);
    
    expect(decoded).toBeNull();
  });
});

// ============================================================================
// authenticateToken Middleware Tests
// ============================================================================
describe('authenticateToken middleware', () => {
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  it('should call next() with valid token', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    const req = { 
      headers: { authorization: `Bearer ${token}` }
    };

    authenticateToken(req, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
  });

  it('should set req.user with decoded payload', () => {
    const user = { id: 1, username: 'testuser', role: 'manager' };
    const token = generateToken(user);
    const req = { 
      headers: { authorization: `Bearer ${token}` }
    };

    authenticateToken(req, mockRes, mockNext);

    expect(req.user.username).toBe('testuser');
    expect(req.user.role).toBe('manager');
  });

  it('should return 401 for missing authorization header', () => {
    const req = { headers: {} };

    authenticateToken(req, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'NO_TOKEN'
    }));
  });

  it('should return 403 for empty token after Bearer prefix', () => {
    const req = { 
      headers: { authorization: 'Bearer ' }
    };

    authenticateToken(req, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    // Empty string is passed to jwt.verify which returns INVALID_TOKEN
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should return 403 for invalid token', () => {
    const req = { 
      headers: { authorization: 'Bearer invalid-token-here' }
    };

    authenticateToken(req, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_TOKEN'
    }));
  });

  it('should return 401 for expired token', () => {
    // Create a token that's already expired
    const payload = { id: 1, username: 'testuser', role: 'admin' };
    const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' });
    
    const req = { 
      headers: { authorization: `Bearer ${expiredToken}` }
    };

    authenticateToken(req, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'TOKEN_EXPIRED'
    }));
  });

  it('should handle token with different signing secret', () => {
    const payload = { id: 1, username: 'testuser', role: 'admin' };
    const wrongSecretToken = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });
    
    const req = { 
      headers: { authorization: `Bearer ${wrongSecretToken}` }
    };

    authenticateToken(req, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_TOKEN'
    }));
  });
});

// ============================================================================
// Token Format Tests
// ============================================================================
describe('token format', () => {
  it('should verify token with correct secret', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    
    const verified = jwt.verify(token, JWT_SECRET);
    
    expect(verified.id).toBe(1);
    expect(verified.username).toBe('testuser');
  });

  it('should throw for token verified with wrong secret', () => {
    const user = { id: 1, username: 'testuser', role: 'admin' };
    const token = generateToken(user);
    
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });
});
