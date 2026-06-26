'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle2, Shield, Loader2, AlertCircle, Lock, Eye, EyeOff, Building2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface AccountGateProps {
  onSubmit: (
    email: string,
    companyName: string,
    password: string,
    consent: { termsAccepted: boolean; marketingConsent: boolean },
  ) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const signUpSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address').max(255, 'Email is too long'),
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(100, 'Company name is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
});

const signInSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type Mode = 'signup' | 'signin';

export default function AccountGate({ onSubmit, onSignIn, isLoading = false, error: externalError }: AccountGateProps) {
  const { language } = useLanguage();
  const [mode, setMode] = useState<Mode>('signup');

  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; companyName?: string; password?: string; terms?: string }>({});

  const t: Record<string, Record<string, string>> = {
    completedTitle: { en: 'You completed the assessment', ro: 'Ai terminat evaluarea' },
    completedBody: {
      en: 'Your answers are saved. To unlock your CyberXscore report and recommendations, create a free account or sign in below.',
      ro: 'Răspunsurile tale sunt salvate. Pentru a debloca raportul CyberXscore și recomandările, creează un cont gratuit sau autentifică-te mai jos.',
    },
    tabSignUp: { en: 'Create account', ro: 'Cont nou' },
    tabSignIn: { en: 'I already have an account', ro: 'Am deja cont' },
    title: { en: 'Create Your Account', ro: 'Creează-ți Contul' },
    titleSignIn: { en: 'Sign in to your account', ro: 'Autentifică-te în cont' },
    subtitle: { en: 'Sign up to unlock your complete CyberXscore report.', ro: 'Înregistrează-te pentru a debloca raportul CyberXscore complet.' },
    subtitleSignIn: { en: "We'll attach this assessment to your account and show you the score.", ro: 'Vom atașa această evaluare contului tău și îți vom afișa scorul.' },
    email: { en: 'Business Email', ro: 'Email de Business' },
    emailPlaceholder: { en: 'you@company.com', ro: 'tu@companie.ro' },
    company: { en: 'Company Name', ro: 'Numele Companiei' },
    companyPlaceholder: { en: 'Your Company', ro: 'Compania Ta' },
    password: { en: 'Password', ro: 'Parola' },
    passwordPlaceholder: { en: 'Min. 8 characters', ro: 'Min. 8 caractere' },
    submit: { en: 'Get My Score', ro: 'Obține Scorul Meu' },
    submitSignIn: { en: 'Sign in & Get My Score', ro: 'Autentifică-te și obține scorul' },
    loading: { en: 'Working…', ro: 'Se procesează…' },
    disclaimer: { en: 'Your data is securely stored and will only be used to provide your assessment results.', ro: 'Datele tale sunt stocate securizat și vor fi folosite doar pentru rezultatele evaluării.' },
    whyAccount: { en: 'Why create an account?', ro: 'De ce să creezi un cont?' },
    reason1: { en: 'Track your security progress over time', ro: 'Urmărește-ți progresul securității în timp' },
    reason2: { en: 'Compare with industry benchmarks', ro: 'Compară cu standardele industriei' },
    reason3: { en: 'Save and share your reports', ro: 'Salvează și distribuie rapoartele' },
    termsLabel: { en: 'I accept the CyberXscore Terms & Conditions', ro: 'Accept Termenii și Condițiile CyberXscore' },
    termsError: { en: 'You must accept the terms to continue', ro: 'Trebuie să accepți termenii pentru a continua' },
    marketingLabel: { en: 'I agree to receive security tips and product updates via email', ro: 'Accept să primesc sfaturi de securitate și noutăți despre produs prin email' },
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = signUpSchema.safeParse({ email, companyName, password });
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.errors.forEach((err) => {
        if (!fieldErrors[err.path[0]]) fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!termsAccepted) {
      setErrors({ terms: t.termsError[language] });
      return;
    }
    setErrors({});
    await onSubmit(email.trim(), companyName.trim(), password, { termsAccepted, marketingConsent });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: any = {};
      result.error.errors.forEach((err) => {
        if (!fieldErrors[err.path[0]]) fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    await onSignIn(email.trim(), password);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.completedTitle[language]}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t.completedBody[language]}</p>
        </div>
      </div>

      <div className="mb-6 inline-flex w-full rounded-md border border-border p-1 bg-muted/30">
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={cn(
            'flex-1 py-2 text-sm rounded-sm font-medium transition-colors',
            mode === 'signup' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t.tabSignUp[language]}
        </button>
        <button
          type="button"
          onClick={() => switchMode('signin')}
          className={cn(
            'flex-1 py-2 text-sm rounded-sm font-medium transition-colors',
            mode === 'signin' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t.tabSignIn[language]}
        </button>
      </div>

      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{mode === 'signup' ? t.title[language] : t.titleSignIn[language]}</h3>
        <p className="text-muted-foreground text-sm mt-1">{mode === 'signup' ? t.subtitle[language] : t.subtitleSignIn[language]}</p>
      </div>

      {mode === 'signup' ? (
        <form onSubmit={handleSignUp} className="space-y-4">
          {externalError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{externalError}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">{t.email[language]}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={t.emailPlaceholder[language]}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((prev) => ({ ...prev, email: undefined })); }}
                className={cn('h-12 pl-10', errors.email && 'border-destructive')}
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-sm font-medium">{t.company[language]}</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="companyName"
                type="text"
                placeholder={t.companyPlaceholder[language]}
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: undefined })); }}
                className={cn('h-12 pl-10', errors.companyName && 'border-destructive')}
                disabled={isLoading}
              />
            </div>
            {errors.companyName && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.companyName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">{t.password[language]}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t.passwordPlaceholder[language]}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((prev) => ({ ...prev, password: undefined })); }}
                className={cn('h-12 pl-10 pr-10', errors.password && 'border-destructive')}
                disabled={isLoading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(c) => { setTermsAccepted(c === true); if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined })); }}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">{t.termsLabel[language]}</Label>
            </div>
            {errors.terms && <p className="text-sm text-destructive flex items-center gap-1 ml-6"><AlertCircle className="w-3 h-3" />{errors.terms}</p>}
            <div className="flex items-start gap-3">
              <Checkbox id="marketing" checked={marketingConsent} onCheckedChange={(c) => setMarketingConsent(c === true)} disabled={isLoading} className="mt-0.5" />
              <Label htmlFor="marketing" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">{t.marketingLabel[language]}</Label>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.loading[language]}</>) : (<><Shield className="w-5 h-5 mr-2" />{t.submit[language]}</>)}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-4">
          {externalError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{externalError}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email-in" className="text-sm font-medium">{t.email[language]}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email-in"
                type="email"
                placeholder={t.emailPlaceholder[language]}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((prev) => ({ ...prev, email: undefined })); }}
                className={cn('h-12 pl-10', errors.email && 'border-destructive')}
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-in" className="text-sm font-medium">{t.password[language]}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password-in"
                type={showPassword ? 'text' : 'password'}
                placeholder={t.passwordPlaceholder[language]}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((prev) => ({ ...prev, password: undefined })); }}
                className={cn('h-12 pl-10 pr-10', errors.password && 'border-destructive')}
                disabled={isLoading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
          </div>
          <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.loading[language]}</>) : (<><Shield className="w-5 h-5 mr-2" />{t.submitSignIn[language]}</>)}
          </Button>
        </form>
      )}

      {mode === 'signup' && (
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">{t.whyAccount[language]}</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" />{t.reason1[language]}</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" />{t.reason2[language]}</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" />{t.reason3[language]}</li>
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground text-center">{t.disclaimer[language]}</p>
    </div>
  );
}
