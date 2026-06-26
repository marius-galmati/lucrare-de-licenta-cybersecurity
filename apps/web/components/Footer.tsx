'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {t('footer.powered')} <span className="font-semibold text-foreground">BITUP TECHNOLOGY</span>
              {' '}{t('footer.partnership')}{' '}
              <span className="font-semibold text-foreground">{t('footer.ubb')}</span>
            </span>
            <img
              src="/ubb-logo.png"
              alt={t('footer.ubb')}
              className="h-7 w-auto flex-shrink-0 rounded-md bg-white px-1.5 py-1 opacity-90"
            />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.privacy')}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t('footer.terms')}</a>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} CyberXscore. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
