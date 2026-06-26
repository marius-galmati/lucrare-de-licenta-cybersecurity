'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-full bg-secondary/50 p-1 backdrop-blur-sm">
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
          language === 'en' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ro')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
          language === 'ro' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        RO
      </button>
    </div>
  );
}
