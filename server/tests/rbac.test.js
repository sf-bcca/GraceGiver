/**
 * RBAC Unit Tests
 * 
 * Tests for Role-Based Access Control module.
 * Covers permission checking, role hierarchy, and ownership validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasPermission,
  isOwner,
  canManageRole,
  requirePermission,
  requireScopedPermission,
  requireRole,
  getPermissionsForRole,
  getRoleInfo,
  PERMISSION_HIERARCHY,
  ROLE_LEVELS
} from '../rbac.js';

// ============================================================================
// hasPermission Tests
// ============================================================================
describe('hasPermission', () => {
  describe('super_admin role', () => {
    it('should have all permissions via wildcard', () => {
      expect(hasPermission('super_admin', 'members:read')).toBe(true);
      expect(hasPermission('super_admin', 'users:delete')).toBe(true);
      expect(hasPermission('super_admin', 'anything:goes')).toBe(true);
    });
  });

  describe('admin role', () => {
    it('should have user management permissions', () => {
      expect(hasPermission('admin', 'users:read')).toBe(true);
      expect(hasPermission('admin', 'users:write')).toBe(true);
      expect(hasPermission('admin', 'users:delete')).toBe(true);
    });

    it('should have member wildcard permissions', () => {
      expect(hasPermission('admin', 'members:read')).toBe(true);
      expect(hasPermission('admin', 'members:create')).toBe(true);
      expect(hasPermission('admin', 'members:update')).toBe(true);
      expect(hasPermission('admin', 'members:delete')).toBe(true);
    });

    it('should have donation wildcard permissions', () => {
      expect(hasPermission('admin', 'donations:read')).toBe(true);
      expect(hasPermission('admin', 'donations:create')).toBe(true);
    });

    it('should have settings permissions', () => {
      expect(hasPermission('admin', 'settings:read')).toBe(true);
      expect(hasPermission('admin', 'settings:write')).toBe(true);
    });
  });

  describe('manager role', () => {
    it('should have member wildcard permissions', () => {
      expect(hasPermission('manager', 'members:read')).toBe(true);
      expect(hasPermission('manager', 'members:create')).toBe(true);
      expect(hasPermission('manager', 'members:delete')).toBe(true);
    });

    it('should have limited donation permissions', () => {
      expect(hasPermission('manager', 'donations:read')).toBe(true);
      expect(hasPermission('manager', 'donations:create')).toBe(true);
      expect(hasPermission('manager', 'donations:update')).toBe(true);
    });

    it('should have report read/export permissions', () => {
      expect(hasPermission('manager', 'reports:read')).toBe(true);
      expect(hasPermission('manager', 'reports:export')).toBe(true);
    });

    it('should NOT have user management permissions', () => {
      expect(hasPermission('manager', 'users:read')).toBe(false);
      expect(hasPermission('manager', 'users:write')).toBe(false);
    });

    it('should NOT have settings write permissions', () => {
      expect(hasPermission('manager', 'settings:write')).toBe(false);
    });
  });

  describe('data_entry role', () => {
    it('should read/create/update members', () => {
      expect(hasPermission('data_entry', 'members:read')).toBe(true);
      expect(hasPermission('data_entry', 'members:create')).toBe(true);
      expect(hasPermission('data_entry', 'members:update')).toBe(true);
    });

    it('should NOT delete members', () => {
      expect(hasPermission('data_entry', 'members:delete')).toBe(false);
    });

    it('should read/create/update donations', () => {
      expect(hasPermission('data_entry', 'donations:read')).toBe(true);
      expect(hasPermission('data_entry', 'donations:create')).toBe(true);
      expect(hasPermission('data_entry', 'donations:update')).toBe(true);
    });

    it('should NOT delete donations', () => {
      expect(hasPermission('data_entry', 'donations:delete')).toBe(false);
    });
  });

  describe('viewer role', () => {
    it('should have read:own permissions only', () => {
      // Viewer has 'members:read:own', not 'members:read'
      expect(hasPermission('viewer', 'members:read')).toBe(false);
      expect(hasPermission('viewer', 'donations:read')).toBe(false);
    });

    it('should NOT have any write permissions', () => {
      expect(hasPermission('viewer', 'members:create')).toBe(false);
      expect(hasPermission('viewer', 'donations:create')).toBe(false);
    });
  });

  describe('auditor role', () => {
    it('should have read-only access to core data', () => {
      expect(hasPermission('auditor', 'members:read')).toBe(true);
      expect(hasPermission('auditor', 'donations:read')).toBe(true);
      expect(hasPermission('auditor', 'reports:read')).toBe(true);
    });

    it('should NOT have write access', () => {
      expect(hasPermission('auditor', 'members:create')).toBe(false);
      expect(hasPermission('auditor', 'donations:create')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for unknown roles', () => {
      expect(hasPermission('nonexistent', 'members:read')).toBe(false);
    });

    it('should return false for empty role', () => {
      expect(hasPermission('', 'members:read')).toBe(false);
    });

    it('should return false for null/undefined role', () => {
      expect(hasPermission(null, 'members:read')).toBe(false);
      expect(hasPermission(undefined, 'members:read')).toBe(false);
    });
  });
});

// ============================================================================
// canManageRole Tests
// ============================================================================
describe('canManageRole', () => {
  describe('super_admin', () => {
    it('should manage all roles', () => {
      expect(canManageRole('super_admin', 'admin')).toBe(true);
      expect(canManageRole('super_admin', 'manager')).toBe(true);
      expect(canManageRole('super_admin', 'data_entry')).toBe(true);
      expect(canManageRole('super_admin', 'viewer')).toBe(true);
      expect(canManageRole('super_admin', 'super_admin')).toBe(true);
    });
  });

  describe('admin', () => {
    it('should manage lower roles', () => {
      expect(canManageRole('admin', 'manager')).toBe(true);
      expect(canManageRole('admin', 'data_entry')).toBe(true);
      expect(canManageRole('admin', 'viewer')).toBe(true);
    });

    it('should NOT manage same or higher roles', () => {
      expect(canManageRole('admin', 'admin')).toBe(false);
      expect(canManageRole('admin', 'super_admin')).toBe(false);
    });
  });

  describe('manager', () => {
    it('should manage lower roles', () => {
      expect(canManageRole('manager', 'data_entry')).toBe(true);
      expect(canManageRole('manager', 'viewer')).toBe(true);
    });

    it('should NOT manage same or higher roles', () => {
      expect(canManageRole('manager', 'manager')).toBe(false);
      expect(canManageRole('manager', 'admin')).toBe(false);
      expect(canManageRole('manager', 'super_admin')).toBe(false);
    });
  });

  describe('data_entry', () => {
    it('should only manage viewer role', () => {
      expect(canManageRole('data_entry', 'viewer')).toBe(true);
    });

    it('should NOT manage same or higher roles', () => {
      expect(canManageRole('data_entry', 'data_entry')).toBe(false);
      expect(canManageRole('data_entry', 'manager')).toBe(false);
    });
  });

  describe('viewer', () => {
    it('should NOT manage any role', () => {
      expect(canManageRole('viewer', 'viewer')).toBe(false);
      expect(canManageRole('viewer', 'data_entry')).toBe(false);
    });
  });
});

// ============================================================================
// isOwner Tests
// ============================================================================
describe('isOwner', () => {
  it('should return true for matching member resource', () => {
    const user = { id: 1, memberId: 'member-123' };
    expect(isOwner(user, 'member', 'member-123')).toBe(true);
  });

  it('should return false for non-matching member resource', () => {
    const user = { id: 1, memberId: 'member-123' };
    expect(isOwner(user, 'member', 'member-456')).toBe(false);
  });

  it('should handle donation_owner resource type', () => {
    const user = { id: 1, memberId: 'member-123' };
    expect(isOwner(user, 'donation_owner', 'member-123')).toBe(true);
    expect(isOwner(user, 'donation_owner', 'member-456')).toBe(false);
  });

  it('should return false for user without memberId', () => {
    const user = { id: 1 };
    expect(isOwner(user, 'member', 'member-123')).toBe(false);
  });

  it('should return false for null user', () => {
    expect(isOwner(null, 'member', 'member-123')).toBe(false);
  });

  it('should handle string/number ID coercion', () => {
    const user = { id: 1, memberId: 123 };
    expect(isOwner(user, 'member', '123')).toBe(true);
    expect(isOwner(user, 'member', 123)).toBe(true);
  });
});

// ============================================================================
// getPermissionsForRole Tests
// ============================================================================
describe('getPermissionsForRole', () => {
  it('should return ["*"] for super_admin', () => {
    expect(getPermissionsForRole('super_admin')).toEqual(['*']);
  });

  it('should expand wildcards for admin', () => {
    const perms = getPermissionsForRole('admin');
    expect(perms).toContain('members:read');
    expect(perms).toContain('members:create');
    expect(perms).toContain('members:update');
    expect(perms).toContain('members:delete');
  });

  it('should return empty array for unknown role', () => {
    expect(getPermissionsForRole('nonexistent')).toEqual([]);
  });
});

// ============================================================================
// getRoleInfo Tests
// ============================================================================
describe('getRoleInfo', () => {
  it('should return correct info for admin', () => {
    const info = getRoleInfo('admin');
    expect(info.name).toBe('admin');
    expect(info.level).toBe(80);
    expect(info.canManageUsers).toBe(true);
    expect(info.canExportData).toBe(true);
  });

  it('should return correct info for viewer', () => {
    const info = getRoleInfo('viewer');
    expect(info.name).toBe('viewer');
    expect(info.level).toBe(20);
    expect(info.canManageUsers).toBe(false);
    expect(info.canExportData).toBe(false);
  });

  it('should handle unknown role with defaults', () => {
    const info = getRoleInfo('nonexistent');
    expect(info.level).toBe(0);
    expect(info.permissions).toEqual([]);
  });
});

// ============================================================================
// Middleware Tests
// ============================================================================
describe('requirePermission middleware', () => {
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  it('should call next() for user with permission', () => {
    const req = { user: { id: 1, role: 'admin' } };
    const middleware = requirePermission('members:read');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 403 for user without permission', () => {
    const req = { user: { id: 1, role: 'viewer' } };
    const middleware = requirePermission('members:create');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'FORBIDDEN'
    }));
  });

  it('should return 401 for unauthenticated user', () => {
    const req = {};
    const middleware = requirePermission('members:read');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AUTH_REQUIRED'
    }));
  });
});

describe('requireRole middleware', () => {
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  it('should call next() for user at required role level', () => {
    const req = { user: { id: 1, role: 'admin' } };
    const middleware = requireRole('admin');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() for user above required role level', () => {
    const req = { user: { id: 1, role: 'super_admin' } };
    const middleware = requireRole('admin');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 for user below required role level', () => {
    const req = { user: { id: 1, role: 'viewer' } };
    const middleware = requireRole('admin');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'FORBIDDEN'
    }));
  });
});

describe('requireScopedPermission middleware', () => {
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
  });

  it('should call next() for global permission (admin)', () => {
    const req = { user: { id: 1, role: 'admin' }, params: { id: 'member-456' } };
    const middleware = requireScopedPermission('members:update', 'member', (req) => req.params.id);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() for own resource (viewer)', () => {
    const req = { user: { id: 1, role: 'viewer', memberId: 'member-123' }, params: { id: 'member-123' } };
    const middleware = requireScopedPermission('members:update', 'member', (req) => req.params.id);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 for someone else\'s resource (viewer)', () => {
    const req = { user: { id: 1, role: 'viewer', memberId: 'member-123' }, params: { id: 'member-456' } };
    const middleware = requireScopedPermission('members:update', 'member', (req) => req.params.id);
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should set scopedToOwn flag when no ID resolved', () => {
    const req = { user: { id: 1, role: 'viewer', memberId: 'member-123' }, query: {} };
    const middleware = requireScopedPermission('members:read', 'member');
    
    middleware(req, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(req.scopedToOwn).toBe(true);
  });
});

// ============================================================================
// ROLE_LEVELS Validation
// ============================================================================
describe('ROLE_LEVELS', () => {
  it('should have correct hierarchy order', () => {
    expect(ROLE_LEVELS.super_admin).toBeGreaterThan(ROLE_LEVELS.admin);
    expect(ROLE_LEVELS.admin).toBeGreaterThan(ROLE_LEVELS.manager);
    expect(ROLE_LEVELS.manager).toBeGreaterThan(ROLE_LEVELS.auditor);
    expect(ROLE_LEVELS.auditor).toBeGreaterThan(ROLE_LEVELS.data_entry);
    expect(ROLE_LEVELS.data_entry).toBeGreaterThan(ROLE_LEVELS.viewer);
  });
});
