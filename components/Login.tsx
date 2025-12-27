import React, { useState } from 'react';
import { login } from '../src/lib/api';
import { Lock, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (mustChangePassword: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorCode(null);
    setIsLoading(true);
    try {
      const data = await login({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Check if password change is required
      const mustChange = data.mustChangePassword || false;
      onLoginSuccess(mustChange);
    } catch (err: any) {
      // Handle different error types
      if (err.response) {
        const errorData = err.response;
        setErrorCode(errorData.code || null);
        
        if (errorData.code === 'ACCOUNT_LOCKED') {
          setError(errorData.message || 'Account is temporarily locked due to too many failed attempts.');
        } else {
          setError(errorData.error || 'Invalid username or password');
        }
      } else {
        setError('Invalid username or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 bg-indigo-900 text-center">
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 text-white">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-indigo-200 mt-2">Sign in to access GraceGiver</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className={`p-4 text-sm rounded-xl font-medium flex items-start gap-3 ${
              errorCode === 'ACCOUNT_LOCKED' 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : 'bg-red-50 text-red-600'
            }`}>
              {errorCode === 'ACCOUNT_LOCKED' && <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />}
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || errorCode === 'ACCOUNT_LOCKED'}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
