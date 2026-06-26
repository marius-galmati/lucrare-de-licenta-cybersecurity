'use client';

import Link from 'next/link';
import { Shield, Zap, Eye, ArrowRight, CheckCircle, Lock, BarChart3 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="container mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
                <Shield className="w-4 h-4" />
                {t('landing.hero.tagline')}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {t('landing.hero.title').split(' ').map((word, i, arr) => (
                  <span key={i} className={i === arr.length - 1 ? 'text-gradient' : ''}>{word} </span>
                ))}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {t('landing.hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button asChild size="lg">
                  <Link href="/assessment">
                    {t('landing.hero.cta')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
              <div className="mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-primary/30 flex items-center justify-center bg-card/50 backdrop-blur-sm glow-primary">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-gradient">73</span>
                      <span className="block text-xs text-muted-foreground">/99</span>
                    </div>
                  </div>
                  <div className="absolute w-48 h-48 animate-spin" style={{ animationDuration: '20s' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t('landing.features.title')}</h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16">Simple. Fast. Actionable.</p>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('landing.features.simple.title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t('landing.features.simple.desc')}</p>
              </div>
              <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('landing.features.actionable.title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t('landing.features.actionable.desc')}</p>
              </div>
              <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('landing.features.transparent.title')}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t('landing.features.transparent.desc')}</p>
              </div>
            </div>
          </div>
        </section>
        <section className="py-16 px-4 bg-card/30 border-y border-border/50">
          <div className="container mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="w-5 h-5 text-success" /><span className="text-sm">No technical expertise required</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Lock className="w-5 h-5 text-primary" /><span className="text-sm">Data stays private</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Zap className="w-5 h-5 text-warning" /><span className="text-sm">Results in 15 minutes</span></div>
            </div>
          </div>
        </section>
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.cta.title')}</h2>
              <p className="text-muted-foreground mb-8">{t('landing.cta.subtitle')}</p>
              <Button asChild size="lg">
                <Link href="/assessment">{t('common.start')}<ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
