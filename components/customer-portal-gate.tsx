'use client';

import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface CustomerPortalGateProps {
  companyName: string;
  displayPhone: string;
  supportEmail: string;
  onUnlocked: () => void;
}

export function CustomerPortalGate({
  companyName,
  displayPhone,
  supportEmail,
  onUnlocked,
}: CustomerPortalGateProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!passcode.trim()) {
      setError('Please enter the shared access passcode.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/portal-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Incorrect access passcode.');
        return;
      }
      onUnlocked();
    } catch {
      setError('Unable to verify passcode right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto my-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-[#1D4ED8]">
        <Lock className="h-5 w-5" />
      </div>
      <h1 className="font-display text-xl font-bold text-slate-900">
        Direct Customer Rate Portal
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        This ordering calculator is shared exclusively with customers of{' '}
        <span className="font-semibold text-slate-900">{companyName}</span>. Enter the
        shared access passcode to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="portal-passcode-input"
            className="block text-sm font-medium text-slate-800"
          >
            Shared Access Passcode
          </label>
          <input
            id="portal-passcode-input"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode"
            autoComplete="off"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
          />
          {error ? (
            <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          <span>{submitting ? 'Verifying...' : 'Access Calculator'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Need access? Contact {displayPhone} or {supportEmail}.
      </p>
    </div>
  );
}
