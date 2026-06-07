'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ADMIN_NAV_GROUPS, SYSTEM_HEALTH_ITEMS, type AdminModuleId } from '@/lib/admin-navigation';
import { BrandLogo } from '@/components/brand-logo';

interface AdminSidebarV2Props {
  activeModule: AdminModuleId;
  onNavigate: (module: AdminModuleId) => void;
}

export function AdminSidebarV2({ activeModule, onNavigate }: AdminSidebarV2Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    ADMIN_NAV_GROUPS.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.id] = group.defaultOpen ?? false;
      return acc;
    }, {})
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside className="w-72 bg-sidebar-bg border-r border-sidebar-border flex flex-col shrink-0 sticky top-0 h-screen">
      <div className="px-5 py-5 border-b border-sidebar-border baha-gradient-card">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showText={false} />
          <div>
            <div className="text-sidebar-text text-[15px] font-display font-bold tracking-tight">Baha Buddy</div>
            <div className="text-brand-blue text-[10px] tracking-widest font-bold">ADMIN COMMAND CENTER</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {ADMIN_NAV_GROUPS.map(group => {
            const open = openGroups[group.id];
            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] tracking-widest uppercase font-bold text-sidebar-muted hover:text-brand-blue hover:bg-brand-blue-light"
                  title={group.description}
                >
                  <span>{group.label}</span>
                  {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {open && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {group.items.map(item => {
                      const active = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left w-full transition-all border ${
                            active
                              ? 'bg-white text-brand-blue-dark border-brand-aqua/40 font-bold shadow-card'
                              : 'text-sidebar-text border-transparent hover:text-brand-blue-dark hover:bg-sidebar-hover hover:border-sidebar-border'
                          }`}
                          title={item.description}
                        >
                          <span className={active ? 'text-brand-aqua' : 'text-sidebar-muted group-hover:text-brand-blue'}>{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-gold-light text-status-warning font-bold uppercase tracking-wide">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border bg-white/65">
        <div className="text-[10px] text-sidebar-muted uppercase tracking-widest font-bold mb-2">System</div>
        <div className="grid grid-cols-1 gap-1.5 mb-3">
          {SYSTEM_HEALTH_ITEMS.slice(0, 3).map(item => (
            <div key={item.label} className="flex items-center justify-between text-[11px] text-body">
              <span className="flex items-center gap-1.5 text-sidebar-text">{item.icon}{item.label}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'connected' ? 'bg-status-success' : item.status === 'monitor' ? 'bg-brand-gold' : 'bg-muted'}`} />
            </div>
          ))}
        </div>
        <div className="text-sidebar-muted text-[10px]">v2.0.0-beta</div>
      </div>
    </aside>
  );
}
