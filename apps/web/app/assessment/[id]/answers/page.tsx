'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';

export default function AssessmentAnswersPage() {
  const { language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const result = await api.assessments.getAnswers(assessmentId);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load answers');
      } finally {
        setLoading(false);
      }
    };
    fetchAnswers();
  }, [assessmentId]);

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push(`/assessment/${assessmentId}/results`)}><ArrowLeft className="w-4 h-4 mr-2" />{language === 'en' ? 'Back to Results' : 'Înapoi la Rezultate'}</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const answers = data.answers || [];
  const gateAnswers = answers.filter((a: any) => a.refType === 'GATE');
  const questionAnswers = answers.filter((a: any) => a.refType === 'QUESTION');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <Button variant="ghost" className="mb-6" onClick={() => router.push(`/assessment/${assessmentId}/results`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />{language === 'en' ? 'Back to Results' : 'Înapoi la Rezultate'}
          </Button>
          <h1 className="text-3xl font-bold mb-8">{language === 'en' ? 'Your Answers' : 'Răspunsurile Tale'}</h1>

          {gateAnswers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">{language === 'en' ? 'Preliminary Assessment' : 'Evaluare Preliminară'}</h2>
              <div className="space-y-2">
                {gateAnswers.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg bg-card border border-border flex justify-between items-center">
                    <span className="text-sm font-medium">{a.refCode}</span>
                    <span className="text-sm text-muted-foreground">{(a.valueJson?.value || a.value_json?.value || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questionAnswers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">{language === 'en' ? 'Security Assessment' : 'Evaluare de Securitate'}</h2>
              <div className="space-y-2">
                {questionAnswers.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg bg-card border border-border flex justify-between items-center">
                    <span className="text-sm font-medium">{a.refCode}</span>
                    <span className="text-sm text-muted-foreground">{(a.valueJson?.value || a.value_json?.value || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
