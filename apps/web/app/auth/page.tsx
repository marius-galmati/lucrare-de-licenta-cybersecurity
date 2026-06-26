'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, getAccessToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Mail, Lock, Building2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function AuthPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const t: Record<string, Record<string, string>> = {
    login: { en: 'Log In', ro: 'Autentificare' },
    signup: { en: 'Sign Up', ro: 'Înregistrare' },
    email: { en: 'Email', ro: 'Email' },
    password: { en: 'Password', ro: 'Parola' },
    company: { en: 'Company Name', ro: 'Numele Companiei' },
    loginTitle: { en: 'Welcome back', ro: 'Bine ai revenit' },
    loginDesc: { en: 'Log in to access your assessments', ro: 'Autentifică-te pentru a accesa evaluările tale' },
    signupTitle: { en: 'Create account', ro: 'Creează cont' },
    signupDesc: { en: 'Sign up to track your security progress', ro: 'Înregistrează-te pentru a urmări progresul securității' },
    forgotPassword: { en: 'Forgot password?', ro: 'Ai uitat parola?' },
    forgotTitle: { en: 'Reset password', ro: 'Resetează parola' },
    forgotDesc: { en: 'Enter your email to receive a reset link', ro: 'Introdu email-ul pentru a primi un link de resetare' },
    sendResetLink: { en: 'Send reset link', ro: 'Trimite link de resetare' },
    backToLogin: { en: 'Back to login', ro: 'Înapoi la autentificare' },
    resetEmailSent: { en: 'Password reset link sent! Check your email.', ro: 'Link-ul de resetare a fost trimis! Verifică email-ul.' },
    termsLabel: { en: 'I accept the CyberXscore Terms & Conditions', ro: 'Accept Termenii și Condițiile CyberXscore' },
    termsError: { en: 'You must accept the terms to continue', ro: 'Trebuie să accepți termenii pentru a continua' },
    marketingLabel: { en: 'I agree to receive security tips and product updates via email', ro: 'Accept să primesc sfaturi de securitate și noutăți despre produs prin email' },
  };

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      api.auth.getMe().then(() => router.push('/')).catch(() => setIsChecking(false));
    } else {
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.auth.login({ email, password });
      router.push('/');
    } catch (err: any) {
      setSubmitError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});
    const result = signUpSchema.safeParse({ email, companyName, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    if (!termsAccepted) { setErrors({ terms: t.termsError[language] }); return; }
    setIsSubmitting(true);
    try {
      await api.auth.register({ email, password, companyName });
      router.push('/');
    } catch (err: any) {
      setSubmitError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    setErrors({});
    const result = z.object({ email: z.string().email() }).safeParse({ email });
    if (!result.success) { setErrors({ email: 'Invalid email' }); return; }
    setIsSubmitting(true);
    try {
      await api.auth.forgotPassword(email);
      setSuccessMessage(t.resetEmailSent[language]);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><Shield className="w-6 h-6 text-primary" /></div>
            <CardTitle>{mode === 'forgot' ? t.forgotTitle[language] : mode === 'login' ? t.loginTitle[language] : t.signupTitle[language]}</CardTitle>
            <CardDescription>{mode === 'forgot' ? t.forgotDesc[language] : mode === 'login' ? t.loginDesc[language] : t.signupDesc[language]}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setSubmitError(null); setSuccessMessage(null); setErrors({}); }}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{t.login[language]}</TabsTrigger>
                <TabsTrigger value="signup">{t.signup[language]}</TabsTrigger>
              </TabsList>

              {submitError && mode !== 'forgot' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{submitError}</span></div>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">{t.email[language]}</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn("pl-10", errors.email && "border-destructive")} disabled={isSubmitting} /></div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">{t.password[language]}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={cn("pl-10 pr-10", errors.password && "border-destructive")} disabled={isSubmitting} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{t.login[language]}</Button>
                  <button type="button" onClick={() => { setMode('forgot'); setSubmitError(null); setSuccessMessage(null); setErrors({}); }} className="text-sm text-primary hover:underline w-full text-center mt-2">{t.forgotPassword[language]}</button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">{t.email[language]}</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn("pl-10", errors.email && "border-destructive")} disabled={isSubmitting} /></div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-company">{t.company[language]}</Label>
                    <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="signup-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={cn("pl-10", errors.companyName && "border-destructive")} disabled={isSubmitting} /></div>
                    {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">{t.password[language]}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={language === 'en' ? 'Min. 8 characters' : 'Min. 8 caractere'} className={cn("pl-10 pr-10", errors.password && "border-destructive")} disabled={isSubmitting} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox id="signup-terms" checked={termsAccepted} onCheckedChange={(c) => { setTermsAccepted(c === true); if (errors.terms) setErrors(prev => ({ ...prev, terms: '' })); }} disabled={isSubmitting} className="mt-0.5" />
                      <Label htmlFor="signup-terms" className="text-sm leading-relaxed cursor-pointer">{t.termsLabel[language]}</Label>
                    </div>
                    {errors.terms && <p className="text-xs text-destructive flex items-center gap-1 ml-6"><AlertCircle className="w-3 h-3" />{errors.terms}</p>}
                    <div className="flex items-start gap-3">
                      <Checkbox id="signup-marketing" checked={marketingConsent} onCheckedChange={(c) => setMarketingConsent(c === true)} disabled={isSubmitting} className="mt-0.5" />
                      <Label htmlFor="signup-marketing" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">{t.marketingLabel[language]}</Label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{t.signup[language]}</Button>
                </form>
              </TabsContent>
            </Tabs>

            {mode === 'forgot' && (
              <div className="mt-6">
                {submitError && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{submitError}</span></div>}
                {successMessage && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm mb-4"><Mail className="w-4 h-4 flex-shrink-0" /><span>{successMessage}</span></div>}
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">{t.email[language]}</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn("pl-10", errors.email && "border-destructive")} disabled={isSubmitting} /></div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{t.sendResetLink[language]}</Button>
                  <button type="button" onClick={() => { setMode('login'); setSubmitError(null); setSuccessMessage(null); setErrors({}); }} className="text-sm text-primary hover:underline w-full text-center">{t.backToLogin[language]}</button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
