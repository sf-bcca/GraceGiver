import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, Check, X, AlertTriangle } from 'lucide-react';

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  expiryDays: number;
  expiryEnabled: boolean;
}

interface PasswordChangeProps {
  onSuccess: () => void;
  onCancel?: () => void;
  isForced?: boolean; // True if user must change password before continuing
  compact?: boolean;  // True if shown within a modal/container
}

const PasswordChange: React.FC<PasswordChangeProps> = ({ onSuccess, onCancel, isForced = false, compact = false }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [strength, setStrength] = useState({ percent: 0, label: 'Enter password' });

  // Fetch password policy on mount
  useEffect(() => {
    fetch('/api/auth/password-policy')
      .then(res => res.json())
      .then(data => setPolicy(data))
      .catch(() => {
        // Use default policy if fetch fails
        setPolicy({
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireDigit: true,
          requireSpecial: true,
          expiryDays: 0,
          expiryEnabled: false
        });
      });
  }, []);

  // Real-time password strength check
  useEffect(() => {
    if (!newPassword) {
      setStrength({ percent: 0, label: 'Enter password' });
      return;
    }

    // Calculate strength locally for immediate feedback
    let score = 0;
    if (newPassword.length >= (policy?.minLength || 12)) score += 15;
    if (newPassword.length >= 16) score += 10;
    if (newPassword.length >= 20) score += 10;
    if (/[A-Z]/.test(newPassword)) score += 15;
    if (/[a-z]/.test(newPassword)) score += 15;
    if (/[0-9]/.test(newPassword)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) score += 20;
    
    let label = 'Weak';
    if (score >= 80) label = 'Excellent';
    else if (score >= 60) label = 'Strong';
    else if (score >= 40) label = 'Good';
    else if (score >= 25) label = 'Fair';
    
    setStrength({ percent: Math.min(100, score), label });
  }, [newPassword, policy]);

  const getStrengthColor = () => {
    if (strength.percent >= 80) return 'bg-green-500';
    if (strength.percent >= 60) return 'bg-emerald-500';
    if (strength.percent >= 40) return 'bg-yellow-500';
    if (strength.percent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const requirements = policy ? [
    { met: newPassword.length >= (policy.minLength || 12), text: `At least ${policy.minLength || 12} characters` },
    { met: !policy.requireUppercase || /[A-Z]/.test(newPassword), text: 'One uppercase letter', required: policy.requireUppercase },
    { met: !policy.requireLowercase || /[a-z]/.test(newPassword), text: 'One lowercase letter', required: policy.requireLowercase },
    { met: !policy.requireDigit || /[0-9]/.test(newPassword), text: 'One digit', required: policy.requireDigit },
    { met: !policy.requireSpecial || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword), text: 'One special character', required: policy.requireSpecial },
    { met: newPassword === confirmPassword && newPassword.length > 0, text: 'Passwords match' }
  ].filter(r => r.required !== false) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setError(data.details.join('. '));
        } else {
          setError(data.error || 'Failed to change password');
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className={`${compact ? 'p-0' : 'p-8'} space-y-5`}>
      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-600 text-sm rounded-xl font-medium flex items-center gap-2">
          <Check size={18} />
          Password changed successfully!
        </div>
      )}

      {/* Current Password */}
      <div>
        <label htmlFor="current-password"
               className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
        <div className="relative">
          <input
            id="current-password"
            type={showCurrent ? 'text' : 'password'}
            required
            data-testid="current-password-input"
            className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label htmlFor="new-password"
               className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
        <div className="relative">
          <input
            id="new-password"
            type={showNew ? 'text' : 'password'}
            required
            data-testid="new-password-input"
            className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Strength Meter */}
        {newPassword && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">Password Strength</span>
              <span className={`font-medium ${
                strength.percent >= 60 ? 'text-green-600' : 
                strength.percent >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>{strength.label}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirm-password"
               className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            required
            data-testid="confirm-password-input"
            className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Requirements Checklist */}
      {newPassword && policy && (
        <div className="bg-slate-50 rounded-xl p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Requirements</h4>
          <div className="space-y-2">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {req.met ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <X size={16} className="text-slate-300" />
                )}
                <span className={req.met ? 'text-green-700' : 'text-slate-500'}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {!isForced && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !requirements.every(r => r.met)}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </form>
  );

  if (compact) {
    return content;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className={`p-8 ${isForced ? 'bg-amber-600' : 'bg-indigo-900'} text-center`}>
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-white">
            {isForced ? <AlertTriangle size={32} /> : <KeyRound size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isForced ? 'Password Change Required' : 'Change Password'}
          </h1>
          <p className={`${isForced ? 'text-amber-100' : 'text-indigo-200'} mt-2`}>
            {isForced 
              ? 'You must change your password before continuing'
              : 'Enter your current password and choose a new one'
            }
          </p>
        </div>
        {content}
      </div>
    </div>
  );
};

export default PasswordChange;
