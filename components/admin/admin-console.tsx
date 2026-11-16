'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  LogOut,
  Package,
  Settings,
} from 'lucide-react';
import type {
  ComboPack,
  InventoryLog,
  OrderRecord,
  Product,
  SiteSettings,
} from '@/lib/types';
import { AdminDashboardTab } from './admin-dashboard-tab';
import { AdminInventoryTab } from './admin-inventory-tab';
import { AdminLogin } from './admin-login';
import { AdminOrdersTab } from './admin-orders-tab';
import { AdminSettingsPhpTab } from './admin-settings-php-tab';

type AdminTab = 'dashboard' | 'orders' | 'inventory' | 'settings';

interface AdminOverviewData {
  orders: OrderRecord[];
  products: Product[];
  combos: ComboPack[];
  inventoryLogs: InventoryLog[];
  settings: SiteSettings;
  metrics: {
    totalOrders: number;
    pendingCount: number;
    totalPipelineValue: number;
    confirmedOrDispatchedValue: number;
    lowStockCount: number;
    unitsByProduct: Record<string, number>;
    revenueByProduct: Record<string, number>;
    statusBreakdown: Record<string, number>;
  };
}

export function AdminConsole() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    try {
      const authRes = await fetch('/api/admin/auth', { cache: 'no-store' });
      const authJson = (await authRes.json()) as { authenticated?: boolean };
      if (!authJson.authenticated) {
        setAuthenticated(false);
        setData(null);
        return;
      }
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthenticated(false);
        setData(null);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as AdminOverviewData;
        setAuthenticated(true);
        setData(json);
      }
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const authRes = await fetch('/api/admin/auth', { cache: 'no-store' });
        const authJson = (await authRes.json()) as { authenticated?: boolean };
        if (!active) return;
        if (!authJson.authenticated) {
          setAuthenticated(false);
          setData(null);
          return;
        }
        const res = await fetch('/api/admin/overview', { cache: 'no-store' });
        if (!active) return;
        if (res.status === 401) {
          setAuthenticated(false);
          setData(null);
          return;
        }
        if (res.ok) {
          const json = (await res.json()) as AdminOverviewData;
          setAuthenticated(true);
          setData(json);
        }
      } finally {
        if (active) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
    setData(null);
  }

  if (!authChecked && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-600">
        Loading Med Invent Admin Console...
      </div>
    );
  }

  if (!authenticated) {
    return <AdminLogin onSuccess={() => void loadOverview()} />;
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof BarChart3 }> = [
    { id: 'dashboard', label: 'Dashboard & Reports', icon: BarChart3 },
    { id: 'orders', label: `Order Submissions (${data?.orders.length ?? 0})`, icon: ClipboardList },
    { id: 'inventory', label: 'Products & Inventory', icon: Package },
    { id: 'settings', label: 'Site Content & PHP', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar Navigation (240px) */}
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <Link
              href="/"
              className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap"
            >
              Med Invent Admin
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Sign out"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <nav
            aria-label="Admin sections"
            className="flex gap-1 overflow-x-auto p-3 lg:flex-col"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0F172A] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden border-t border-slate-200 p-4 lg:mt-auto lg:block">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <div className="flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
            <div className="text-xs font-medium text-slate-500">
              <span>Med Invent Devices</span>
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-900">
                {navItems.find((i) => i.id === activeTab)?.label}
              </span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <span>Open Customer Calculator</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </header>

          <main className="mx-auto max-w-6xl p-4 sm:p-6">
            {!data ? (
              <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ) : activeTab === 'dashboard' ? (
              <AdminDashboardTab
                products={data.products}
                orders={data.orders}
                inventoryLogs={data.inventoryLogs}
                metrics={data.metrics}
              />
            ) : activeTab === 'orders' ? (
              <AdminOrdersTab orders={data.orders} onRefresh={loadOverview} />
            ) : activeTab === 'inventory' ? (
              <AdminInventoryTab
                products={data.products}
                combos={data.combos}
                onRefresh={loadOverview}
              />
            ) : (
              <AdminSettingsPhpTab
                key={JSON.stringify(data.settings)}
                settings={data.settings}
                onRefresh={loadOverview}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
