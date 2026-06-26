'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileDown, Share2, RotateCcw, CheckCircle, AlertTriangle, Loader2, Copy, Check, ArrowLeft, Eye, Lightbulb, Target } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_NAMES } from '@cyberxscore/scoring';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface Recommendation {
  code: string;
  priority: Priority;
  category: string;
  text: { en: string; ro: string };
}

interface Gap {
  code: string;
  type: 'gate' | 'question';
  category: string;
  impact: 'critical' | 'high' | 'medium';
  text: { en: string; ro: string };
}

const PRIORITY_LABEL: Record<Priority, { en: string; ro: string }> = {
  critical: { en: 'Critical', ro: 'Critic' },
  high: { en: 'High', ro: 'Ridicat' },
  medium: { en: 'Medium', ro: 'Mediu' },
  low: { en: 'Low', ro: 'Scăzut' },
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-warning/15 text-warning border-warning/30',
  medium: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
  low: 'bg-muted text-muted-foreground border-border',
};

function getCategoryName(category: string, language: 'en' | 'ro'): string {
  const cat = (CATEGORY_NAMES as Record<string, { en: string; ro: string } | undefined>)[category];
  return cat ? cat[language] : category;
}

export default function AssessmentResultsPage() {
  const { language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const result = await api.assessments.getResults(assessmentId);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" /><p className="text-muted-foreground">{language === 'en' ? 'Loading results...' : 'Se încarcă rezultatele...'}</p></div>
      </div>
    );
  }

  if (error || !data?.score) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 flex items-center justify-center px-4">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{language === 'en' ? 'Unable to load results' : 'Nu s-au putut încărca rezultatele'}</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => router.push('/history')}><ArrowLeft className="w-4 h-4 mr-2" />{language === 'en' ? 'Back to History' : 'Înapoi la Istoric'}</Button>
              <Button onClick={() => router.push('/assessment')}>{language === 'en' ? 'Start New Assessment' : 'Începe Evaluare Nouă'}</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const score = data.score;
  const breakdown = score.breakdownJson || score.breakdown_json || {};
  const globalScore = Number(score.scoreValue ?? score.score_value ?? 0);
  const riskScore = Number(score.riskScore ?? score.risk_score ?? 0);
  const maturityScore = Number(score.maturityScore ?? score.maturity_score ?? 0);
  const riskLevel = breakdown.riskLevel || 'medium';
  const capsApplied = breakdown.capsApplied || [];
  const penalties = breakdown.penalties || 0;
  const topGaps = breakdown.topGaps || [];
  const recommendations = breakdown.recommendations || [];
  const categoryScores = breakdown.categoryScores || [];

  const handleShare = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(language === 'en' ? 'Link copied!' : 'Link copiat!');
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setIsCreatingShare(true);
    try {
      const result = await api.shareLinks.create(assessmentId);
      setShareUrl(result.shareUrl);
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      toast.success(language === 'en' ? 'Share link copied!' : 'Link de partajare copiat!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error(language === 'en' ? 'Failed to create share link' : 'Eroare la crearea link-ului'); }
    finally { setIsCreatingShare(false); }
  };

  const getSummary = () => {
    if (language === 'en') {
      if (riskLevel === 'critical') return 'Your organization has critical cybersecurity gaps that require immediate attention.';
      if (riskLevel === 'high') return 'Your cybersecurity posture needs significant improvement.';
      if (riskLevel === 'medium') return 'Your organization has a moderate cybersecurity foundation but there\'s room for improvement.';
      if (riskLevel === 'low') return 'Good job! Your organization demonstrates solid cybersecurity practices.';
      return 'Excellent! Your organization has strong cybersecurity practices in place.';
    } else {
      if (riskLevel === 'critical') return 'Organizația dumneavoastră are lacune critice de securitate cibernetică care necesită atenție imediată.';
      if (riskLevel === 'high') return 'Postura dumneavoastră de securitate cibernetică necesită îmbunătățiri semnificative.';
      if (riskLevel === 'medium') return 'Organizația dumneavoastră are o fundație moderată de securitate cibernetică, dar există loc de îmbunătățire.';
      if (riskLevel === 'low') return 'Bravo! Organizația dumneavoastră demonstrează practici solide de securitate cibernetică.';
      return 'Excelent! Organizația dumneavoastră are practici puternice de securitate cibernetică implementate.';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" className="mb-6" onClick={() => router.push('/history')}><ArrowLeft className="w-4 h-4 mr-2" />{language === 'en' ? 'Back to History' : 'Înapoi la Istoric'}</Button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium mb-4"><CheckCircle className="w-4 h-4" />{language === 'en' ? 'Assessment Complete' : 'Evaluare Completă'}</div>
            <h1 className="text-3xl md:text-4xl font-bold">{language === 'en' ? 'Your CyberXscore' : 'CyberXscore-ul Tău'}</h1>
            {data.companyName && <p className="text-muted-foreground mt-2">{data.companyName}</p>}
          </div>

          <div className="flex justify-center mb-8">
            <div className="text-center">
              <div className="text-6xl font-bold">{globalScore}<span className="text-xl text-muted-foreground"> / 99</span></div>
              <div className="text-sm text-muted-foreground mt-2 capitalize">{riskLevel} {language === 'en' ? 'Risk' : 'Risc'}</div>
              <div className="flex gap-8 mt-4 justify-center">
                <div><div className="text-2xl font-bold">{riskScore.toFixed(1)}</div><div className="text-xs text-muted-foreground">{language === 'en' ? 'Risk' : 'Risc'} / 60</div></div>
                <div className="w-px bg-border" />
                <div><div className="text-2xl font-bold">{maturityScore.toFixed(1)}</div><div className="text-xs text-muted-foreground">{language === 'en' ? 'Maturity' : 'Maturitate'} / 40</div></div>
              </div>
            </div>
          </div>

          {(capsApplied.length > 0 || penalties < 0) && (
            <div className="mb-8 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning mb-1">{language === 'en' ? 'Score Adjustments Applied' : 'Ajustări de Scor Aplicate'}</p>
                <p className="text-sm text-muted-foreground">{language === 'en' ? 'Your score was affected by critical security gaps.' : 'Scorul dumneavoastră a fost afectat de lacune critice de securitate.'}</p>
              </div>
            </div>
          )}

          <div className="mb-8 p-6 rounded-2xl bg-card border border-border">
            <h3 className="text-lg font-semibold mb-3">{language === 'en' ? 'Executive Summary' : 'Sumar Executiv'}</h3>
            <p className="text-muted-foreground leading-relaxed">{getSummary()}</p>
          </div>

          {topGaps.length > 0 && (
            <div className="mb-8 p-6 rounded-2xl bg-card border border-border">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-warning" />
                {language === 'en' ? 'Top Security Gaps' : 'Principalele Lacune'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'en'
                  ? 'Areas with the biggest impact on your score.'
                  : 'Zonele cu cel mai mare impact asupra scorului.'}
              </p>
              <ul className="space-y-3">
                {(topGaps as Gap[]).map((gap) => (
                  <li
                    key={gap.code}
                    className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div
                      className={cn(
                        'shrink-0 px-2 py-0.5 rounded-md text-xs font-medium border h-fit',
                        PRIORITY_CLASSES[gap.impact],
                      )}
                    >
                      {PRIORITY_LABEL[gap.impact][language as 'en' | 'ro']}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {gap.text[language as 'en' | 'ro']}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getCategoryName(gap.category, language as 'en' | 'ro')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mb-8 p-6 rounded-2xl bg-card border border-border">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                {language === 'en' ? 'Recommended Actions' : 'Acțiuni Recomandate'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'en'
                  ? 'Prioritized steps to improve your security posture.'
                  : 'Pași prioritari pentru îmbunătățirea posturii de securitate.'}
              </p>
              <ol className="space-y-3">
                {(recommendations as Recommendation[]).map((rec, idx) => (
                  <li
                    key={rec.code}
                    className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-medium border',
                            PRIORITY_CLASSES[rec.priority],
                          )}
                        >
                          {PRIORITY_LABEL[rec.priority][language as 'en' | 'ro']}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getCategoryName(rec.category, language as 'en' | 'ro')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {rec.text[language as 'en' | 'ro']}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button variant="outline" onClick={handleShare} disabled={isCreatingShare}>
              {isCreatingShare ? <Loader2 className="w-4 h-4 animate-spin" /> : copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? (language === 'en' ? 'Copied!' : 'Copiat!') : (language === 'en' ? 'Share Results' : 'Partajează')}
            </Button>
            <Button variant="secondary" asChild><Link href="/assessment"><RotateCcw className="w-4 h-4 mr-2" />{language === 'en' ? 'Retake Assessment' : 'Reia Evaluarea'}</Link></Button>
          </div>

          <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              {language === 'en'
                ? 'Disclaimer: This is a self-assessment tool and does not constitute an audit, certification, or compliance evaluation.'
                : 'Disclaimer: Acesta este un instrument de auto-evaluare și nu constituie un audit, certificare sau evaluare de conformitate.'}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
