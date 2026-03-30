import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Tv, Gift, Flag, Newspaper,
  Wrench, ShieldBan, Settings, ChevronLeft, Menu, X, Megaphone, MonitorPlay,
} from 'lucide-react';

const mainLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/channels', label: 'Chaînes', icon: Tv },
  { to: '/admin/premium-codes', label: 'Codes Premium', icon: Gift },
  { to: '/admin/reports', label: 'Signalements', icon: Flag },
  { to: '/admin/news', label: 'Actualités', icon: Newspaper },
  { to: '/admin/bans', label: 'Bannissements', icon: ShieldBan },
  { to: '/admin/ads', label: 'Publicités', icon: MonitorPlay },
];

const systemLinks = [
  { to: '/admin/announcement', label: 'Bandeau', icon: Megaphone },
  { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { refresh } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Re-check ban/maintenance status on every admin page navigation
  useEffect(() => {
    refresh();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const NavContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <>
      {/* Header */}
      <div className={`h-16 flex items-center border-b border-navy-800/50 ${isCollapsed ? 'px-3 justify-start' : 'px-5 gap-3'}`}>
        <img loading="lazy" src="/branding/xonaris-icon-bg.png" alt="Xonaris" className="w-9 h-9 rounded-md shrink-0" />
        {!isCollapsed && (
          <>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold text-white leading-tight">Xonaris</span>
              <span className="text-[10px] text-navy-400 uppercase tracking-widest">Admin</span>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto lg:hidden p-1.5 rounded-lg text-navy-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className="space-y-0.5">
          {mainLinks.map((l) => {
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to) && pathname !== '/admin';
            const isExactAdmin = l.exact && pathname === l.to;
            const isActive = l.exact ? isExactAdmin : active;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? l.label : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                  isCollapsed ? 'justify-start px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 shadow-sm shadow-brand-500/5'
                    : 'text-navy-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <l.icon className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!isCollapsed && l.label}
              </Link>
            );
          })}
        </div>

        {/* System section */}
        <div className={`mt-4 pt-4 border-t border-navy-800/40 space-y-0.5`}>
          {!isCollapsed && (
            <p className="text-[10px] text-navy-600 uppercase tracking-widest px-3 mb-2">Système</p>
          )}
          {systemLinks.map((l) => {
            const isActive = pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? l.label : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                  isCollapsed ? 'justify-start px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 shadow-sm shadow-brand-500/5'
                    : 'text-navy-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <l.icon className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!isCollapsed && l.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Back link & collapse toggle */}
      <div className={`border-t border-navy-800/50 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs text-navy-600 hover:text-navy-300 hover:bg-white/5 transition-colors mb-1"
          title={isCollapsed ? 'Déplier' : 'Réduire'}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          {!isCollapsed && 'Réduire'}
        </button>
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          title={isCollapsed ? 'Retour au site' : undefined}
          className={`flex items-center rounded-xl text-sm text-navy-400 hover:text-white hover:bg-white/5 transition-colors ${
            isCollapsed ? 'justify-start px-2 py-2.5' : 'gap-2 px-3 py-2'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          {!isCollapsed && 'Retour au site'}
        </Link>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-[#060a0f] flex overflow-hidden">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden h-14 bg-[#0a1018]/95   border-b border-navy-800/50 flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-navy-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img loading="lazy" src="/branding/xonaris-icon-bg.png" alt="Xonaris" className="w-7 h-7 rounded-lg" />
          <span className="font-display text-sm font-bold text-white">Xonaris Admin</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Desktop: always visible, Mobile: slide from left */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${collapsed ? 'w-[68px]' : 'w-64'} bg-[#0a1018]/80   border-r border-navy-800/50 flex flex-col shrink-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <NavContent isCollapsed={collapsed} />
      </aside>

      {/* Content — FULL WIDTH, no max-w constraint */}
      <div className="flex-1 overflow-y-auto pt-14 lg:pt-0 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
