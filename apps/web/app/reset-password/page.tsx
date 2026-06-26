'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const t: Record<string, Record<string, string>> = {
    title: { en: 'Set new password', ro: 'Setează parola nouă' },
    desc: { en: 'Enter your new password below', ro: 'Introdu noua parolă mai jos' },
    password: { en: 'New Password', ro: 'Parola Nouă' },
    confirmPassword: { en: 'Confirm Password', ro: 'Confirmă Parola' },
    placeholder: { en: 'Min. 8 characters', ro: 'Min. 8 caractere' },
    submit: { en: 'Update password', ro: 'Actualizează parola' },
    success: { en: 'Password updated successfully! Redirecting...', ro: 'Parola a fost actualizată! Redirecționare...' },
    invalidLink: { en: 'Invalid or expired reset link. Please request a new one.', ro: 'Link invalid sau expirat. Te rugăm să soliciți unul nou.' },
    goToLogin: { en: 'Go to login', ro: 'Mergi la autentificare' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    if (!token) { setSubmitError(t.invalidLink[language]); return; }
    setIsSubmitting(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push('/auth'), 2000);
    } catch (err: any) {
      setSubmitError(err.message || t.invalidLink[language]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center px-4 pb-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"><AlertCircle className="w-4 h-4" /><span>{t.invalidLink[language]}</span></div>
              <Button onClick={() => router.push('/auth')} className="w-full">{t.goToLogin[language]}</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 flex items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><Shield className="w-6 h-6 text-primary" /></div>
            <CardTitle>{t.title[language]}</CardTitle>
            <CardDescription>{t.desc[language]}</CardDescription>
          </CardHeader>
          <CardContent>
            {success && <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-sm mb-4"><CheckCircle className="w-4 h-4" /><span>{t.success[language]}</span></div>}
            {submitError && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4"><AlertCircle className="w-4 h-4" /><span>{submitError}</span></div>}
            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t.password[language]}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.placeholder[language]} className={cn("pl-10 pr-10", errors.password && "border-destructive")} disabled={isSubmitting} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t.confirmPassword[language]}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={cn("pl-10 pr-10", errors.confirmPassword && "border-destructive")} disabled={isSubmitting} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{t.submit[language]}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
