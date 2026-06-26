'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Building2, FileQuestion, Download, FileText, Shield, LogOut, Link2,
  Home, Layers, ToggleLeft, GitBranch, PanelLeftClose, PanelLeftOpen, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: Home, exact: true },
  { path: '/admin/companies', label: 'Companies', icon: Building2 },
  { path: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { path: '/admin/categories', label: 'Categories', icon: Layers },
  { path: '/admin/answer-types', label: 'Answer Types', icon: ToggleLeft },
  { path: '/admin/gate-rules', label: 'Gate Rules', icon: GitBranch },
  { path: '/admin/dedupe-pairs', label: 'Dedupe Pairs', icon: Link2 },
  { path: '/admin/exports', label: 'Exports', icon: Download },
  { path: '/admin/audit', label: 'Audit Logs', icon: FileText },
];

const COLLAPSED_KEY = 'cxs_admin_sidebar_collapsed';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(COLLAPSED_KEY) : null;
    if (stored === 'true') setCollapsed(true);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? 'true' : 'false'); } catch { /* ignorăm depășirea cotei de stocare */ }
  }, [collapsed, hydrated]);

  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await api.auth.logout();
    router.push('/');
  };

  const isActive = (item: typeof navItems[number]) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path) && pathname !== '/admin';

  const sidebarWidth = collapsed ? 'md:w-16' : 'md:w-60';

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg hidden sm:inline">CyberXscore Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              <span className="hidden sm:inline">Back to app</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            'hidden md:flex md:flex-col md:sticky md:top-16 md:h-[calc(100vh-4rem)]',
            'bg-background border-r border-border transition-[width] duration-200 ease-in-out',
            sidebarWidth,
          )}
        >
          <div className={cn('flex items-center border-b border-border h-12 px-2', collapsed ? 'justify-center' : 'justify-end')}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                    collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="md:hidden fixed left-0 top-0 z-50 h-full w-64 bg-background border-r border-border flex flex-col">
              <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <Shield className="w-6 h-6 text-primary" />
                  <span className="font-bold">Admin</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
