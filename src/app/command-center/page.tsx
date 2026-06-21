'use client';

import { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { AdminSidebarV2 } from '@/components/admin-sidebar-v2';
import { RevenueModule } from '@/components/revenue-module';
import { AdminUsersModule } from '@/components/admin-users-module';
import { HighIntentModule } from '@/components/high-intent-module';
import { PlacesManagerModule } from '@/components/places-manager-module';
import { PartnersModuleV2 } from '@/components/partners-module-v2';
import { BookingsModule } from '@/components/bookings-module';
import { ConciergeOrdersModule } from '@/components/concierge-orders-module';
import { PaymentsModule } from '@/components/payments-module';
import { GuidedDayModule } from '@/components/guided-day-module';
import { DefaultMediaLibraryModule } from '@/components/default-media-library-module';
import { DealsManagerModule } from '@/components/deals-manager-module';
import { LaunchReadinessModule } from '@/components/launch-readiness-module';
import { AuditModule, BillingModule, ChatModule, ContentPerformanceModule, DestinationIntelligenceModule, SupportModule, TravelersModule, TripsModule } from '@/components/admin-core-modules';
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

  const renderOverview = () => (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-hairline p-6 shadow-card baha-gradient-card">
        <h2 className="text-2xl font-display font-bold text-ink tracking-tight mb-2">Baha Buddy Command Center</h2>
        <p className="text-sm text-body max-w-3xl leading-relaxed">
          Grouped workspace for launch readiness, revenue, bookings, concierge orders, payments, travelers, trips, destination intelligence, content, chat, support, systems, media, and audit operations.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <OverviewCard label="Foundation" value="Live" note="Access, audit, places, partners" />
        <OverviewCard label="Modules" value="20" note="Grouped into 4 sections" />
        <OverviewCard label="Default Media" value="Ready" note="Headers for pages and cards" success />
        <OverviewCard label="Launch gate" value="Tracked" note="Scenario approvals and blockers" success />
      </div>
    </div>
  );

  const renderModule = () => {
    if (activeModule === 'overview') return renderOverview();
    if (activeModule === 'launch-readiness') return <LaunchReadinessModule />;
    if (activeModule === 'revenue') return <RevenueModule />;
    if (activeModule === 'bookings') return <BookingsModule />;
    if (activeModule === 'concierge-orders') return <ConciergeOrdersModule />;
    if (activeModule === 'guided-day') return <GuidedDayModule />;
    if (activeModule === 'payments') return <PaymentsModule />;
    if (activeModule === 'travelers') return <TravelersModule />;
    if (activeModule === 'trips') return <TripsModule />;
    if (activeModule === 'destination-intelligence') return <DestinationIntelligenceModule />;
    if (activeModule === 'content-performance') return <ContentPerformanceModule />;
    if (activeModule === 'chat') return <ChatModule />;
    if (activeModule === 'billing') return <BillingModule />;
    if (activeModule === 'support') return <SupportModule />;
    if (activeModule === 'audit') return <AuditModule />;
    if (activeModule === 'admin-users') return <AdminUsersModule />;
    if (activeModule === 'high-intent') return <HighIntentModule />;
    if (activeModule === 'places') return <PlacesManagerModule />;
    if (activeModule === 'partners') return <PartnersModuleV2 />;
    if (activeModule === 'deals') return <DealsManagerModule />;
    if (activeModule === 'default-media-library') return <DefaultMediaLibraryModule />;
    return null;
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
            <button onClick={handleRefresh} disabled={refreshing} className="px-3 py-1.5 rounded-lg border border-hairline bg-white text-xs text-body font-medium flex items-center gap-1.5 hover:border-brand-blue disabled:opacity-60" title="Reload all data on this page">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="p-1.5 rounded-lg border border-hairline bg-white hover:border-brand-blue" title="Notifications">
              <Bell size={16} className="text-body" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white text-sm font-display font-bold">V</div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto bg-surface/40">{renderModule()}</div>
      </main>
    </div>
  );
}

function OverviewCard({ label, value, note, success }: { label: string; value: string; note: string; success?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-hairline shadow-card">
      <div className="text-[11px] text-muted font-medium tracking-wider uppercase mb-2">{label}</div>
      <div className={`text-2xl font-display font-bold ${success ? 'text-status-success' : 'text-ink'}`}>{value}</div>
      <div className="text-[11px] text-muted mt-1">{note}</div>
    </div>
  );
}
