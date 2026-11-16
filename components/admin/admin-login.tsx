'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Lock } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter administrator email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        return;
      }
      onSuccess();
    } catch {
      setError('Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials() {
    setEmail('admin@medinventdevices.com');
    setPassword('MedInvent@2026');
    setError('');
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-7">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[#0F172A]">
            <Lock className="h-5 w-5" />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Calculator</span>
          </Link>
        </div>

        <h1 className="font-display text-xl font-bold text-slate-900">
          Med Invent Admin Console
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in to manage order submissions, product pricing, stock levels, site terms,
          and PHP/MySQL deployment files.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@medinventdevices.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-slate-700"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          {error ? (
            <p className="text-xs font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Signing In...' : 'Sign In to Admin Console'}
          </button>
        </form>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              <div className="font-semibold text-slate-800">Demo Credentials</div>
              <div className="font-mono text-[11px] text-slate-500">
                admin@medinventdevices.com / MedInvent@2026
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Fill Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
