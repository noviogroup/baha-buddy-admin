'use client';

import { useAuth } from './auth-provider';
import { LoginScreen } from './login-screen';
import { Loader2 } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-body">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Access Denied</h2>
          <p className="text-sm text-zinc-500 mb-4">
            <strong>{user.email}</strong> is not authorized for admin access.
          </p>
          <p className="text-xs text-zinc-400 mb-6">
            Contact the Novio Group team to get your email added to the admin allowlist.
          </p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 text-sm font-medium hover:border-zinc-300"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
