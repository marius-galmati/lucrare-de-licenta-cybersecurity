import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Lock, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function getSharedResults(token: string) {
  try {
    const res = await fetch(`${API_URL}/share-links/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SharedResultsPage({ params }: { params: { token: string } }) {
  const data = await getSharedResults(params.token);
  const cookieStore = cookies();
  const lang = cookieStore.get('lang')?.value === 'ro' ? 'ro' : 'en';

  if (!data || !data.score) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">{lang === 'en' ? 'Unable to Access' : 'Acces Imposibil'}</h1>
            <p className="text-muted-foreground">{lang === 'en' ? 'This share link is invalid or has expired.' : 'Acest link de partajare este invalid sau a expirat.'}</p>
          </div>
        </main>
      </div>
    );
  }

  const score = data.score;
  const breakdown = score.breakdownJson || score.breakdown_json || {};
  const globalScore = Number(score.scoreValue ?? score.score_value ?? 0);
  const riskScore = Number(score.riskScore ?? score.risk_score ?? 0);
  const maturityScore = Number(score.maturityScore ?? score.maturity_score ?? 0);
  const riskLevel = breakdown.riskLevel || 'medium';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-muted-foreground text-sm font-medium mb-4">
              <Lock className="w-4 h-4" />
              {lang === 'en' ? 'Shared Results (Read-Only)' : 'Rezultate Partajate (Doar Citire)'}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{lang === 'en' ? 'CyberXscore Results' : 'Rezultate CyberXscore'}</h1>
            {data.companyName && <p className="text-muted-foreground mt-2">{data.companyName}</p>}
          </div>

          <div className="flex justify-center mb-8">
            <div className="text-center">
              <div className="text-5xl font-bold">{globalScore}<span className="text-lg text-muted-foreground"> / 99</span></div>
              <div className="text-sm text-muted-foreground mt-2 capitalize">{riskLevel} {lang === 'en' ? 'Risk' : 'Risc'}</div>
              <div className="flex gap-8 mt-4 justify-center">
                <div><div className="text-xl font-bold">{riskScore.toFixed(1)}</div><div className="text-xs text-muted-foreground">{lang === 'en' ? 'Risk' : 'Risc'} / 60</div></div>
                <div><div className="text-xl font-bold">{maturityScore.toFixed(1)}</div><div className="text-xs text-muted-foreground">{lang === 'en' ? 'Maturity' : 'Maturitate'} / 40</div></div>
              </div>
            </div>
          </div>

          <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              {lang === 'en'
                ? 'Disclaimer: This is a self-assessment tool and does not constitute an audit, certification, or compliance evaluation.'
                : 'Disclaimer: Acesta este un instrument de auto-evaluare și nu constituie un audit, certificare sau evaluare de conformitate.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
