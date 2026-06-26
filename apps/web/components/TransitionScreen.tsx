'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransitionScreenProps {
  onContinue: () => void;
  questionCount: number;
  animate?: boolean;
}

export default function TransitionScreen({ onContinue, questionCount, animate = true }: TransitionScreenProps) {
  const { t, language } = useLanguage();

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-6 py-12 px-4 text-center",
      animate && "animate-fade-in"
    )}>
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-foreground max-w-md">{t('transition.title')}</h2>
      <p className="text-muted-foreground max-w-md">{t('transition.body')}</p>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
        <span>{language === 'en' ? `${questionCount} questions selected` : `${questionCount} întrebări selectate`}</span>
      </div>
      <Button onClick={onContinue} size="lg" className="mt-4 gap-2">
        {t('transition.cta')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
