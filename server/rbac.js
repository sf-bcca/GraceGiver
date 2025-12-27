/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Implements a 5-tier role hierarchy:
 * 1. super_admin - Full system access
 * 2. admin - User management + all data operations
 * 3. manager - Reports + member/donation management
 * 4. data_entry - Create/edit members and donations
 * 5. viewer - Read-only access
 */

// Permission definitions by role
const PERMISSION_HIERARCHY = {
  super_admin: ['*'],
  admin: [
    'users:read', 'users:write', 'users:delete',
    'members:*',
    'donations:*',
    'reports:*',
    'settings:read'
  ],
  manager: [
    'members:*',
    'donations:read', 'donations:create', 'donations:update', 'donations:delete:own',
    'reports:read', 'reports:export'
  ],
  data_entry: [
    'members:read', 'members:create', 'members:update',
    'donations:read', 'donations:create', 'donations:update'
  ],
  viewer: [
    'members:read',
    'donations:read',
    'reports:read'
  ]
};

// Role levels for hierarchy comparisons (higher = more privileged)
const ROLE_LEVELS = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  data_entry: 40,
  viewer: 20
};

/**
 * Check if a role has a specific permission
 * 
 * @param {string} userRole - The user's role
 * @param {string} requiredPermission - The permission to check (e.g., 'members:read')
 * @returns {boolean}
 */
function hasPermission(userRole, requiredPermission) {
  const userPermissions = PERMISSION_HIERARCHY[userRole] || [];
  
  // Super admin has all permissions
  if (userPermissions.includes('*')) return true;
  
  // Check exact match
  if (userPermissions.includes(requiredPermission)) return true;
  
  // Check wildcard match (e.g., 'members:*' matches 'members:read')
  const [resource, action] = requiredPermission.split(':');
  if (userPermissions.includes(`${resource}:*`)) return true;
  
  return false;
}

/**
 * Check if a role can manage another role
 * (Prevents admins from promoting to super_admin or managing super_admins)
 * 
 * @param {string} actorRole - The role of the user performing the action
 * @param {string} targetRole - The role being assigned or modified
 * @returns {boolean}
 */
function canManageRole(actorRole, targetRole) {
  const actorLevel = ROLE_LEVELS[actorRole] || 0;
  const targetLevel = ROLE_LEVELS[targetRole] || 0;
  
  // Cannot assign or modify roles at or above your own level
  // Exception: super_admin can manage everything
  if (actorRole === 'super_admin') return true;
  
  return actorLevel > targetLevel;
}

/**
 * Express middleware factory for permission checking
 * 
 * @param {string} permission - Required permission (e.g., 'members:read')
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userRole = req.user.role || 'viewer';
    
    if (!hasPermission(userRole, permission)) {
      console.warn(`[RBAC] Access denied: User ${req.user.id} (${userRole}) attempted ${permission}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permission,
        role: userRole
      });
    }
    
    next();
  };
}

/**
 * Express middleware to require a minimum role level
 * 
 * @param {string} minimumRole - The minimum role required
 * @returns {Function} Express middleware
 */
function requireRole(minimumRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userRole = req.user.role || 'viewer';
    const userLevel = ROLE_LEVELS[userRole] || 0;
    const requiredLevel = ROLE_LEVELS[minimumRole] || 0;
    
    if (userLevel < requiredLevel) {
      console.warn(`[RBAC] Role check failed: User ${req.user.id} (${userRole}) needs at least ${minimumRole}`);
      return res.status(403).json({ 
        error: 'Insufficient role',
        code: 'FORBIDDEN',
        required: minimumRole,
        role: userRole
      });
    }
    
    next();
  };
}

/**
 * Get all permissions for a role
 * 
 * @param {string} role - The role name
 * @returns {string[]} Array of permission strings
 */
function getPermissionsForRole(role) {
  const permissions = PERMISSION_HIERARCHY[role] || [];
  
  // Expand wildcards for frontend use
  if (permissions.includes('*')) {
    return ['*']; // Frontend should interpret this as "all permissions"
  }
  
  // Expand resource wildcards
  const expanded = [];
  permissions.forEach(perm => {
    if (perm.endsWith(':*')) {
      const resource = perm.split(':')[0];
      expanded.push(`${resource}:read`, `${resource}:create`, `${resource}:update`, `${resource}:delete`);
    } else {
      expanded.push(perm);
    }
  });
  
  return [...new Set(expanded)]; // Remove duplicates
}

/**
 * Get role metadata for frontend
 * 
 * @param {string} role - The role name
 * @returns {object} Role metadata including level and permissions
 */
function getRoleInfo(role) {
  return {
    name: role,
    level: ROLE_LEVELS[role] || 0,
    permissions: getPermissionsForRole(role),
    canManageUsers: hasPermission(role, 'users:write'),
    canExportData: hasPermission(role, 'reports:export'),
    canDeleteMembers: hasPermission(role, 'members:delete'),
    canDeleteDonations: hasPermission(role, 'donations:delete')
  };
}

module.exports = {
  hasPermission,
  canManageRole,
  requirePermission,
  requireRole,
  getPermissionsForRole,
  getRoleInfo,
  PERMISSION_HIERARCHY,
  ROLE_LEVELS
};
