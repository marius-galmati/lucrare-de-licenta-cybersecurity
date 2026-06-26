'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, getAccessToken, clearAccessToken } from '@/lib/api';

export default function Header() {
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [companyName, setCompanyName] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const token = getAccessToken();
    if (token) {
      api.auth.getMe()
        .then((me) => {
          setIsAuthenticated(true);
          setCompanyName(me.profile?.companyName ?? null);
          setIsAdmin(!!me.isAdmin);
        })
        .catch(() => {
          setIsAuthenticated(false);
          setIsAdmin(false);
        });
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }, [pathname]);

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/assessment', label: t('nav.assessment') },
    ...(isAuthenticated ? [{ path: '/history', label: language === 'en' ? 'History' : 'Istoric' }] : []),
  ];

  const handleSignOut = async () => {
    await api.auth.logout();
    setIsAuthenticated(false);
    setCompanyName(null);
    setIsAdmin(false);
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Shield className="h-8 w-8 text-primary transition-all duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <span className="text-xl font-bold">
            <span className="text-foreground">Cyber</span>
            <span className="text-gradient">Xscore</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.path}
              href={link.path}
              className={cn(
                "text-sm font-medium transition-colors duration-200",
                pathname === link.path ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {companyName && (
                <span className="hidden sm:inline text-sm text-muted-foreground">{companyName}</span>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">{language === 'en' ? 'Log Out' : 'Deconectare'}</span>
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => router.push('/auth')} className="text-muted-foreground hover:text-foreground">
              <LogIn className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">{language === 'en' ? 'Log In' : 'Autentificare'}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
