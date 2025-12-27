import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Lock, Unlock, Key, Trash2, 
  Edit2, X, Check, AlertCircle, Loader2, Mail, Calendar 
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: string;
  email: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isLocked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  mustChangePassword: boolean;
}

interface Role {
  name: string;
  level: number;
  label: string;
}

interface UserManagementProps {
  currentUserId: number;
  currentUserRole: string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 border-red-200',
  admin: 'bg-orange-100 text-orange-800 border-orange-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  data_entry: 'bg-green-100 text-green-800 border-green-200',
  viewer: 'bg-slate-100 text-slate-800 border-slate-200'
};

const UserManagement: React.FC<UserManagementProps> = ({ currentUserId, currentUserRole }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  
  // Form states
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', role: 'viewer' });
  const [newPassword, setNewPassword] = useState('');

  const getToken = () => localStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify(newUser)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }
      
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', email: '', role: 'viewer' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user');
      }
      
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUnlockUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/unlock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unlock user');
      }
      
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ newPassword })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      
      setResetPasswordUser(null);
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const canManageUser = (user: User) => {
    if (user.id === currentUserId) return false;
    if (user.role === 'super_admin') return false;
    
    const roleHierarchy: Record<string, number> = {
      super_admin: 100, admin: 80, manager: 60, data_entry: 40, viewer: 20
    };
    
    return (roleHierarchy[currentUserRole] || 0) > (roleHierarchy[user.role] || 0);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 mt-1">Manage user accounts, roles, and permissions.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
        >
          <UserPlus size={18} />
          Add User
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          <h2 className="font-bold text-slate-800">All Users ({users.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Login</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{user.username}</span>
                      {user.email && (
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail size={12} /> {user.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingUser?.id === user.id ? (
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                        className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                      >
                        {roles.map(role => (
                          <option key={role.name} value={role.name}>{role.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}>
                        <Shield size={12} />
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                          <Lock size={14} /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <Check size={14} /> Active
                        </span>
                      )}
                      {user.mustChangePassword && (
                        <span className="text-amber-600 text-xs">Must change password</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {user.lastLoginAt ? (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(user.lastLoginAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-slate-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingUser?.id === user.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateRole(user.id, editingUser.role)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          {canManageUser(user) && (
                            <>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Role"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setResetPasswordUser(user)}
                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Reset Password"
                              >
                                <Key size={16} />
                              </button>
                              {user.isLocked && (
                                <button
                                  onClick={() => handleUnlockUser(user.id)}
                                  className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Unlock Account"
                                >
                                  <Unlock size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {user.id === currentUserId && (
                            <span className="text-xs text-slate-400 italic">You</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Create New User</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Min 12 characters"
                />
                <p className="text-xs text-slate-400 mt-1">User will be required to change on first login</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (optional)</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {roles.map(role => (
                    <option key={role.name} value={role.name}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Reset Password for {resetPasswordUser.username}</h3>
              <button onClick={() => setResetPasswordUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Min 12 characters"
                />
                <p className="text-xs text-slate-400 mt-1">User will be required to change on next login</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
