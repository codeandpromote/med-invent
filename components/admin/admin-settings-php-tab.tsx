'use client';

import { useEffect, useState } from 'react';
import { Download, FileCode2, Plus, Save, Trash2 } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';

interface AdminSettingsPhpTabProps {
  settings: SiteSettings;
  onRefresh: () => Promise<void>;
}

interface PhpFilePreview {
  path: string;
  size: number;
  preview: string;
}

export function AdminSettingsPhpTab({
  settings,
  onRefresh,
}: AdminSettingsPhpTabProps) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [phpFiles, setPhpFiles] = useState<PhpFilePreview[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');

  useEffect(() => {
    fetch('/api/php-bundle?mode=manifest')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { files?: PhpFilePreview[] } | null) => {
        if (data?.files?.length) {
          setPhpFiles(data.files);
          setActiveFilePath(data.files[0].path);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedNotice('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSavedNotice('Site content, customer terms, and portal access settings saved.');
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const activeFile = phpFiles.find((f) => f.path === activeFilePath) ?? phpFiles[0];

  return (
    <div className="space-y-8">
      {/* Site Content & Customer Portal Access Form */}
      <form
        onSubmit={handleSaveSettings}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Site Content, Terms &amp; Access Passcode
            </h2>
            <p className="text-xs text-slate-500">
              Changes reflect immediately on the live customer calculator.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving...' : 'Save Site Content'}</span>
          </button>
        </div>

        {savedNotice ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
            {savedNotice}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Company Name
            </label>
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Existing Corporate Website URL
            </label>
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Receiving WhatsApp Number (with 91 country code)
            </label>
            <input
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Display Phone Number
            </label>
            <input
              value={form.displayPhone}
              onChange={(e) => setForm({ ...form, displayPhone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Support Email
            </label>
            <input
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Promo Banner Text
            </label>
            <input
              value={form.promoBannerText}
              onChange={(e) => setForm({ ...form, promoBannerText: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Delivery Coverage Notice
            </label>
            <input
              value={form.deliveryCoverageNote}
              onChange={(e) =>
                setForm({ ...form, deliveryCoverageNote: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Distributor Disclaimer (Combo Section)
            </label>
            <input
              value={form.distributorDisclaimer}
              onChange={(e) =>
                setForm({ ...form, distributorDisclaimer: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Footer Patent &amp; Trademark Notice
            </label>
            <input
              value={form.patentFooterNote}
              onChange={(e) =>
                setForm({ ...form, patentFooterNote: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Portal Shared Passcode Section */}
        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Unlisted Link + Shared Customer Passcode
              </h3>
              <p className="text-xs text-slate-600">
                When enabled, customers must enter the shared passcode before viewing
                rates or submitting orders.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-900">
              <input
                type="checkbox"
                checked={form.portalPasscodeEnabled}
                onChange={(e) =>
                  setForm({ ...form, portalPasscodeEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>Require Passcode</span>
            </label>
          </div>
          <div className="mt-3 max-w-xs">
            <label className="block text-xs font-semibold text-slate-700">
              Shared Passcode
            </label>
            <input
              value={form.portalPasscode}
              onChange={(e) => setForm({ ...form, portalPasscode: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>

        {/* Customer-Facing Terms Editor */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Customer-Facing Ordering &amp; Payment Terms
            </label>
            <button
              type="button"
              onClick={() => setForm({ ...form, terms: [...form.terms, ''] })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Term</span>
            </button>
          </div>
          <div className="space-y-2">
            {form.terms.map((term, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 text-xs font-semibold text-slate-500">
                  {idx + 1}.
                </span>
                <input
                  value={term}
                  onChange={(e) => {
                    const next = [...form.terms];
                    next[idx] = e.target.value;
                    setForm({ ...form, terms: next });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
                <button
                  type="button"
                  aria-label={`Remove term ${idx + 1}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      terms: form.terms.filter((_, i) => i !== idx),
                    })
                  }
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* PHP + MySQL Shared Hosting Package Exporter */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              PHP 8 + MySQL Shared-Hosting Integration Package
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Drop-in folder structure (`order-calculator/`) ready to upload beside{' '}
              <span className="font-mono">corporate/index2.php</span> on your shared
              cPanel server.
            </p>
          </div>
          <a
            href="/api/php-bundle"
            download="medinvent-php-mysql-calculator.zip"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E40AF] whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Download PHP + MySQL Bundle (.zip)</span>
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-1 lg:col-span-4">
            {phpFiles.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => setActiveFilePath(f.path)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  activeFile?.path === f.path
                    ? 'border-[#1D4ED8] bg-[#EFF6FF] font-semibold text-[#1E3A8A]'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 truncate font-mono">
                  <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{f.path}</span>
                </span>
                <span className="ml-2 shrink-0 font-mono text-[11px] text-slate-500">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
              <span className="font-mono">{activeFile?.path ?? 'Loading...'}</span>
              <span>PHP 8 / MySQL InnoDB</span>
            </div>
            <pre className="max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
              {activeFile?.preview ?? 'Loading PHP & MySQL source files...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
