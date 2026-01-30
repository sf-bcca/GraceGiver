import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Phone, Lock, Check, X, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onRegisterSuccess: (token: string, user: any) => void;
  onBackToLogin: () => void;
}

const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
};

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    password: "",
    confirmPassword: ""
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [strength, setStrength] = useState({ percent: 0, label: 'Weak' });

  // Fetch password policy on mount
  useEffect(() => {
    fetch('/api/auth/password-policy')
      .then(res => res.json())
      .then(data => setPolicy(data))
      .catch(() => {
        setPolicy({ minLength: 12, requireUppercase: true, requireLowercase: true, requireDigit: true, requireSpecial: true });
      });
  }, []);

  // Strength check
  useEffect(() => {
    if (!formData.password) {
      setStrength({ percent: 0, label: 'Enter password' });
      return;
    }
    let score = 0;
    if (formData.password.length >= (policy?.minLength || 12)) score += 15;
    if (formData.password.length >= 16) score += 10;
    if (/[A-Z]/.test(formData.password)) score += 15;
    if (/[a-z]/.test(formData.password)) score += 15;
    if (/[0-9]/.test(formData.password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) score += 20;
    
    let label = 'Weak';
    if (score >= 80) label = 'Excellent';
    else if (score >= 60) label = 'Strong';
    else if (score >= 40) label = 'Good';
    else if (score >= 25) label = 'Fair';
    setStrength({ percent: Math.min(100, score), label });
  }, [formData.password, policy]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Required";
    if (!formData.lastName.trim()) newErrors.lastName = "Required";
    if (!REGEX.EMAIL.test(formData.email)) newErrors.email = "Invalid email";
    if (formData.password.length < (policy?.minLength || 12)) newErrors.password = `Min ${policy?.minLength || 12} chars`;
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.message || data.error || "Registration failed" });
        return;
      }

      // Store auth info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      onRegisterSuccess(data.token, data.user);
    } catch (err) {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const requirements = policy ? [
    { met: formData.password.length >= policy.minLength, text: `At least ${policy.minLength} characters` },
    { met: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
    { met: /[0-9]/.test(formData.password), text: 'One digit' },
    { met: formData.password === formData.confirmPassword && formData.password.length > 0, text: 'Passwords match' }
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 bg-indigo-900 text-center relative">
          <button 
            onClick={onBackToLogin}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-white">
            <UserPlus size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Join GraceGiver</h1>
          <p className="text-indigo-200 mt-2">Create your member account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-8 space-y-4">
          {errors.general && (
            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium flex items-center gap-2">
              <AlertCircle size={18} />
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">First Name</label>
                          <input
                            required
                            id="firstName"
                            type="text"
                            className={`w-full px-4 py-2 bg-slate-50 border ${errors.firstName ? "border-red-400 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all text-sm`}
                            value={formData.firstName}
                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                          />
                          {errors.firstName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.firstName}</p>}
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Last Name</label>
                          <input
                            required
                            id="lastName"
                            type="text"
                            className={`w-full px-4 py-2 bg-slate-50 border ${errors.lastName ? "border-red-400 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all text-sm`}
                            value={formData.lastName}
                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                          />
                          {errors.lastName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.lastName}</p>}
                        </div>
                      </div>
            
                      <div>
                        <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            required
                            id="email"
                            type="email"
                            className={`w-full pl-10 pr-4 py-2 bg-slate-50 border ${errors.email ? "border-red-400 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all text-sm`}
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        {errors.email ? (
                          <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.email}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-1">This will also be your username for signing in.</p>
                        )}
                      </div>
            
                      <div>
                        <label htmlFor="password" title="password" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            required
                            id="password"
                            type="password"
                            className={`w-full pl-10 pr-4 py-2 bg-slate-50 border ${errors.password ? "border-red-400 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all text-sm`}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                          />
                        </div>
                        {errors.password && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.password}</p>}
                        
                        {formData.password && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="text-slate-500 font-bold uppercase tracking-tighter">Strength: {strength.label}</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  strength.percent >= 60 ? 'bg-emerald-500' : strength.percent >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${strength.percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
            
                      <div>
                        <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Confirm Password</label>
                        <input
                          required
                          id="confirmPassword"
                          type="password"
                          className={`w-full px-4 py-2 bg-slate-50 border ${errors.confirmPassword ? "border-red-400 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"} rounded-lg outline-none focus:ring-2 text-slate-900 transition-all text-sm`}
                          value={formData.confirmPassword}
                          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                        {errors.confirmPassword && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.confirmPassword}</p>}
                      </div>
            
                      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        {requirements.map((req, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] font-medium">
                            {req.met ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-slate-300" />}
                            <span className={req.met ? 'text-emerald-700' : 'text-slate-500'}>{req.text}</span>
                          </div>
                        ))}
                      </div>
            
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                      </button>
          
          <button 
            type="button"
            onClick={onBackToLogin}
            className="w-full text-sm font-bold text-indigo-600 hover:text-indigo-700 py-2"
          >
            Already have an account? Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
