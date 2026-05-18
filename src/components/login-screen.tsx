'use client';

import { useState } from 'react';
import { useAuth } from './auth-provider';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    const result = await signIn(email.trim(), password.trim());
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-body">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-extrabold">B</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Baha Buddy Admin</h1>
          <p className="text-sm text-zinc-400 mt-1">Sign in to access the dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@noviogroup.com"
                required
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 placeholder:text-zinc-300 font-body"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 placeholder:text-zinc-300 font-body"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Signing in...</>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-400 mt-8">
          Only authorized Novio Group team members can access this panel.
        </p>
      </div>
    </div>
  );
}
