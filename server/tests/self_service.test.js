/**
 * Self-Service Feature Unit Tests
 * 
 * Tests for member self-service portal functionality,
 * including profile access and donation history scoping.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isOwner,
  requireScopedPermission,
  PERMISSION_HIERARCHY
} from '../rbac.js';

describe('isOwner - Self Service Scoping', () => {
  it('should return true for matching member resource', () => {
    const user = { id: 1, memberId: 'member-123' };
    expect(isOwner(user, 'member', 'member-123')).toBe(true);
  });

  it('should return true for matching donation resource (mapped via memberId)', () => {
    const user = { id: 1, memberId: 'member-123' };
    // The current implementation uses 'donation_owner' for this check
    expect(isOwner(user, 'donation_owner', 'member-123')).toBe(true);
  });

  it('should return false for mismatched memberId', () => {
    const user = { id: 1, memberId: 'member-123' };
    expect(isOwner(user, 'member', 'member-999')).toBe(false);
  });
});

describe('requireScopedPermission - Viewer Role', () => {
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  it('should allow viewer to access their own member record', () => {
    const req = { 
      user: { id: 1, role: 'viewer', memberId: 'M1' },
      params: { id: 'M1' }
    };
    const middleware = requireScopedPermission('members:read', 'member', (req) => req.params.id);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny viewer from accessing another member record', () => {
    const req = { 
      user: { id: 1, role: 'viewer', memberId: 'M1' },
      params: { id: 'M2' }
    };
    const middleware = requireScopedPermission('members:read', 'member', (req) => req.params.id);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should set scopedToOwn flag for list requests without ID', () => {
    const req = { 
      user: { id: 1, role: 'viewer', memberId: 'M1' },
      query: {}
    };
    // No idResolver provided
    const middleware = requireScopedPermission('donations:read', 'donation');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(req.scopedToOwn).toBe(true);
  });

  it('should allow admin to access any record (global permission)', () => {
    const req = { 
      user: { id: 1, role: 'admin', memberId: 'ADMIN1' },
      params: { id: 'M2' }
    };
    const middleware = requireScopedPermission('members:read', 'member', (req) => req.params.id);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(req.scopedToOwn).toBeUndefined();
  });

  it('should allow viewer to access their own donation via memberId resolver', () => {
    const req = { 
      user: { id: 1, role: 'viewer', memberId: 'M1' },
      params: { memberId: 'M1' }
    };
    // If we use 'donation' as resource type, it currently fails in isOwner
    const middleware = requireScopedPermission('donations:read', 'donation', (req) => req.params.memberId);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });
});
