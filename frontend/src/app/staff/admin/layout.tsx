'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStaffStore } from '@/store/useStaffStore';
import { AdminToastProvider } from '@/components/admin/AdminToast';
import {
  LayoutDashboard, UtensilsCrossed, Grid3X3, Users,
  ClipboardList, BarChart3, Shield, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/staff/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/staff/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/staff/admin/tables', label: 'Tables', icon: Grid3X3 },
  { href: '/staff/admin/staff', label: 'Staff', icon: Users },
  { href: '/staff/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/staff/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/staff/admin/audit-log', label: 'Audit Log', icon: Shield },
];

function getPageTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) =>
    item.href === '/staff/admin'
      ? pathname === '/staff/admin'
      : pathname.startsWith(item.href)
  );
  return match?.label || 'Admin';
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
      <span className="text-xs font-black text-white tracking-tight">{initials}</span>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, profile, clearAuth } = useStaffStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || profile?.role !== 'ADMIN') {
      router.replace('/staff/login');
    }
  }, [isAuthenticated, profile, router]);

  if (!isAuthenticated() || profile?.role !== 'ADMIN') return null;

  const handleLogout = () => {
    clearAuth();
    router.replace('/staff/login');
  };

  const isActive = (href: string) =>
    href === '/staff/admin' ? pathname === '/staff/admin' : pathname.startsWith(href);

  const pageTitle = getPageTitle(pathname);

  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-stone-50 flex">
        {/* ─── Desktop Sidebar ─── */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-50">
          <div className="flex flex-col flex-1 bg-zinc-950 border-r border-zinc-800/50">
            {/* Accent strip */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-400 opacity-60" />

            {/* Branding */}
            <div className="px-6 py-6 border-b border-zinc-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <LayoutDashboard className="w-5 h-5 text-zinc-900" />
                </div>
                <div>
                  <h1 className="text-[15px] font-black tracking-tight text-white">Tawlax</h1>
                  <p className="text-[9px] font-bold tracking-[0.25em] text-zinc-500 uppercase mt-0.5">Admin Console</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-200 relative group ${
                      active
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="admin-nav-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-400 rounded-full"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-indigo-400' : ''}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="px-3 py-4 border-t border-zinc-800/40 space-y-3">
              <div className="px-3 py-2 flex items-center gap-3">
                <UserInitials name={profile?.name || 'A'} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-200 truncate">{profile?.name}</p>
                  <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-600 uppercase">Admin</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold tracking-tight text-zinc-600 hover:text-red-400 hover:bg-red-400/[0.06] transition-all duration-200"
              >
                <LogOut className="w-[18px] h-[18px]" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Mobile Header ─── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-zinc-950 border-b border-zinc-800/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-zinc-900" />
            </div>
            <span className="text-white font-bold tracking-tight text-sm">Tawlax Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white p-1.5 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Mobile Sidebar Overlay ─── */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-950 border-r border-zinc-800/50 flex flex-col"
              >
                {/* Accent strip */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-400 opacity-60" />

                <div className="px-5 py-5 border-b border-zinc-800/40 flex justify-between items-center">
                  <span className="text-white font-bold tracking-tight text-sm">Tawlax Admin</span>
                  <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-white p-1 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold tracking-tight transition-all duration-200 ${
                          active
                            ? 'bg-white/[0.08] text-white'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-indigo-400' : ''}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="px-3 py-4 border-t border-zinc-800/40">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-zinc-600 hover:text-red-400 hover:bg-red-400/[0.06] transition-all"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── Content Area ─── */}
        <div className="flex-1 lg:ml-64">
          {/* Breadcrumb bar */}
          <div className="hidden lg:flex items-center gap-2 px-8 pt-6 pb-0 text-xs font-medium text-stone-400">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-stone-700 font-bold">{pageTitle}</span>
          </div>
          <main className="pt-14 lg:pt-0 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
