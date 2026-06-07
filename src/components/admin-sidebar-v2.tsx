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
    <aside className="w-72 bg-sidebar-bg flex flex-col shrink-0 sticky top-0 h-screen">
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" showText={false} />
          <div>
            <div className="text-white text-[15px] font-display font-semibold tracking-tight">Baha Buddy</div>
            <div className="text-zinc-500 text-[10px] tracking-widest font-medium">ADMIN COMMAND CENTER</div>
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
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] tracking-widest uppercase font-semibold text-zinc-500 hover:text-zinc-300"
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
                          className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left w-full transition-all ${
                            active ? 'bg-sidebar-active text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-sidebar-hover'
                          }`}
                          title={item.description}
                        >
                          <span className={active ? 'text-white' : 'opacity-70 group-hover:opacity-100'}>{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold font-bold uppercase tracking-wide">
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

      <div className="px-4 py-3 border-t border-white/5">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2">System</div>
        <div className="grid grid-cols-1 gap-1.5 mb-3">
          {SYSTEM_HEALTH_ITEMS.slice(0, 3).map(item => (
            <div key={item.label} className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">{item.icon}{item.label}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'connected' ? 'bg-status-success' : item.status === 'monitor' ? 'bg-status-warning' : 'bg-zinc-600'}`} />
            </div>
          ))}
        </div>
        <div className="text-zinc-600 text-[10px]">v2.0.0-beta</div>
      </div>
    </aside>
  );
}
