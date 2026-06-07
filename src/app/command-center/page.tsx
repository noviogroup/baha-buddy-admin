'use client';

import { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { AdminSidebarV2 } from '@/components/admin-sidebar-v2';
import { AdminModulePlaceholder } from '@/components/admin-module-placeholder';
import { RevenueModule } from '@/components/revenue-module';
import { AdminUsersModule } from '@/components/admin-users-module';
import { HighIntentModule } from '@/components/high-intent-module';
import { PlacesModule } from '@/components/places-module';
import { ADMIN_MODULE_LOOKUP, type AdminModuleId } from '@/lib/admin-navigation';

export default function CommandCenterPage() {
  const [activeModule, setActiveModule] = useState<AdminModuleId>('overview');
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const active = ADMIN_MODULE_LOOKUP[activeModule];

  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('admin:refresh'));
    setTimeout(() => setRefreshing(false), 600);
  };

  const renderModule = () => {
    if (activeModule === 'overview') {
      return (
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-xl border border-hairline p-6 shadow-card">
            <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">Baha Buddy Command Center</h2>
            <p className="text-sm text-body max-w-3xl leading-relaxed">
              This is the new grouped admin workspace for revenue, bookings, travelers, trips, places, partners, destination intelligence, AI, support, and audit operations. The existing dashboard remains available while modules are wired to live data one by one.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
              <div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Admin foundation</div>
              <div className="text-2xl font-display font-bold text-ink">Live</div>
              <div className="text-[11px] text-muted mt-1">admin_users, audit, PII logs</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
              <div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Modules</div>
              <div className="text-2xl font-display font-bold text-ink">15</div>
              <div className="text-[11px] text-muted mt-1">Grouped into 4 sections</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
              <div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Live modules</div>
              <div className="text-2xl font-display font-bold text-ink">4</div>
              <div className="text-[11px] text-muted mt-1">Revenue, Admin Users, High-Intent, Places</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
              <div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">Foundation gate</div>
              <div className="text-2xl font-display font-bold text-status-warning">Trips RLS</div>
              <div className="text-[11px] text-muted mt-1">Still required before beta</div>
            </div>
          </div>
        </div>
      );
    }

    if (activeModule === 'revenue') return <RevenueModule />;
    if (activeModule === 'admin-users') return <AdminUsersModule />;
    if (activeModule === 'high-intent') return <HighIntentModule />;
    if (activeModule === 'places') return <PlacesModule />;

    return <AdminModulePlaceholder moduleId={activeModule} />;
  };

  return (
    <div className="flex min-h-screen font-body bg-white">
      <AdminSidebarV2 activeModule={activeModule} onNavigate={setActiveModule} />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex justify-between items-center px-6 py-3.5 bg-white border-b border-hairline sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-ink">{active?.label || 'Command Center'}</h1>
            <span className="text-xs text-muted">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg border border-hairline bg-white text-xs text-body font-medium flex items-center gap-1.5 hover:border-brand-blue disabled:opacity-60"
              title="Reload all data on this page"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="p-1.5 rounded-lg border border-hairline bg-white hover:border-brand-blue" title="Notifications">
              <Bell size={16} className="text-body" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white text-sm font-display font-bold">V</div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto bg-surface/40">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}
