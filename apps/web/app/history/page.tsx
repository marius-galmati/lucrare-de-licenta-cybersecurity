'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Clock,
  History as HistoryIcon,
  Loader2,
  Eye,
  Play,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_KEY_ID = 'current_assessment_id';
const STORAGE_KEY_TOKEN = 'session_token';
const STORAGE_KEY_JWT = 'session_jwt';

interface Assessment {
  id: string;
  language: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  latestScore: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-primary';
  if (score >= 60) return 'text-success';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-warning';
  return 'text-destructive';
}

function getScoreStroke(score: number): string {
  if (score >= 80) return 'hsl(var(--primary))';
  if (score >= 60) return 'hsl(var(--success))';
  if (score >= 40) return '#facc15';
  if (score >= 20) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

interface ScoreEvolutionChartProps {
  points: { date: Date; score: number }[];
  language: 'en' | 'ro';
}

function ScoreEvolutionChart({ points, language }: ScoreEvolutionChartProps) {
  const width = 720;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 32, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Distribuim punctele uniform pe axa X (contează ordinea cronologică, nu intervalele reale de timp).
  const xs = points.map((_, i) =>
    points.length === 1
      ? padding.left + innerW / 2
      : padding.left + (i / (points.length - 1)) * innerW,
  );
  const ys = points.map(
    (p) => padding.top + innerH - (p.score / 99) * innerH,
  );

  const path = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${ys[i]}`).join(' ');
  const area = `${path} L ${xs[xs.length - 1]} ${padding.top + innerH} L ${xs[0]} ${padding.top + innerH} Z`;

  const gridLines = [0, 20, 40, 60, 80, 99];
  const dateFmt = new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
    month: 'short',
    day: 'numeric',
  });

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest.score - first.score;
  const trendLabel =
    points.length < 2
      ? null
      : delta > 0
      ? `+${delta.toFixed(1)}`
      : delta < 0
      ? delta.toFixed(1)
      : '0';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {language === 'ro' ? 'Evoluție Scor' : 'Score Evolution'}
          </span>
        </div>
        {trendLabel !== null && (
          <Badge
            variant="outline"
            className={cn(
              'font-mono',
              delta > 0 && 'text-success border-success/30',
              delta < 0 && 'text-destructive border-destructive/30',
            )}
          >
            {trendLabel} {language === 'ro' ? 'puncte' : 'pts'}
          </Badge>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => {
          const y = padding.top + innerH - (g / 99) * innerH;
          return (
            <g key={g}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                fontSize="10"
                textAnchor="end"
                fill="hsl(var(--muted-foreground))"
              >
                {g}
              </text>
            </g>
          );
        })}

        <path d={area} fill="url(#scoreGradient)" />
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={xs[i]}
              cy={ys[i]}
              r={4}
              fill={getScoreStroke(p.score)}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
            <text
              x={xs[i]}
              y={ys[i] - 10}
              fontSize="11"
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontWeight="600"
            >
              {Math.round(p.score)}
            </text>
            <text
              x={xs[i]}
              y={padding.top + innerH + 18}
              fontSize="10"
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              {dateFmt.format(p.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function HistoryPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Assessment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const t: Record<string, Record<string, string>> = {
    title: { en: 'Assessment History', ro: 'Istoric Evaluări' },
    subtitle: {
      en: 'Track your security progress over time',
      ro: 'Urmărește-ți progresul securității în timp',
    },
    noAssessments: { en: 'No assessments yet', ro: 'Nicio evaluare încă' },
    startNew: { en: 'Start New Assessment', ro: 'Începe Evaluare Nouă' },
    completed: { en: 'Completed', ro: 'Finalizat' },
    inProgress: { en: 'In Progress', ro: 'În Progres' },
    viewResults: { en: 'View Results', ro: 'Vezi Rezultatele' },
    continue: { en: 'Continue', ro: 'Continuă' },
    deleteBtn: { en: 'Delete', ro: 'Șterge' },
    deleteTitle: { en: 'Delete assessment?', ro: 'Ștergi evaluarea?' },
    deleteDesc: {
      en: 'This permanently removes the assessment and all of its answers. This action cannot be undone.',
      ro: 'Această acțiune șterge definitiv evaluarea și toate răspunsurile ei. Nu poate fi anulată.',
    },
    cancel: { en: 'Cancel', ro: 'Anulează' },
    dashboardTitle: { en: 'Your Security Journey', ro: 'Evoluția Ta de Securitate' },
    dashboardEmpty: {
      en: 'Complete an assessment to see your score evolution.',
      ro: 'Finalizează o evaluare pentru a vedea evoluția scorului.',
    },
    currentScore: { en: 'Latest score', ro: 'Scor curent' },
    averageScore: { en: 'Average', ro: 'Medie' },
    bestScore: { en: 'Best', ro: 'Cel mai bun' },
  };

  const handleContinue = (assessmentId: string) => {
    localStorage.setItem(STORAGE_KEY_ID, assessmentId);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_JWT);
    router.push('/assessment');
  };

  const handleStartNew = () => {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_JWT);
    router.push('/assessment');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await api.assessments.remove(pendingDelete.id);
      // Dacă evaluarea ștearsă era cea activă pentru reluare, curățăm și starea locală.
      if (localStorage.getItem(STORAGE_KEY_ID) === pendingDelete.id) {
        localStorage.removeItem(STORAGE_KEY_ID);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_JWT);
      }
      setAssessments((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      toast.success(
        language === 'ro' ? 'Evaluarea a fost ștearsă.' : 'Assessment deleted.',
      );
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(
        language === 'ro'
          ? `Ștergere eșuată: ${err.message ?? 'eroare necunoscută'}`
          : `Delete failed: ${err.message ?? 'unknown error'}`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.assessments.getHistory();
        setAssessments(data as Assessment[]);
      } catch { /* eroare gestionată de middleware */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const completedPoints = useMemo(() => {
    return assessments
      .filter((a) => a.status === 'completed' && a.latestScore !== null)
      .map((a) => ({
        date: new Date(a.completedAt ?? a.createdAt),
        score: Number(a.latestScore),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [assessments]);

  const stats = useMemo(() => {
    if (completedPoints.length === 0) return null;
    const scores = completedPoints.map((p) => p.score);
    return {
      latest: scores[scores.length - 1],
      avg: scores.reduce((s, v) => s + v, 0) / scores.length,
      best: Math.max(...scores),
    };
  }, [completedPoints]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
              <HistoryIcon className="w-8 h-8 text-primary" />
              {t.title[language]}
            </h1>
            <p className="text-muted-foreground mt-1">{t.subtitle[language]}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : assessments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t.noAssessments[language]}
                </h3>
                <Button onClick={handleStartNew} className="mt-4">
                  {t.startNew[language]}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {t.dashboardTitle[language]}
                  </h2>
                  {completedPoints.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {t.dashboardEmpty[language]}
                    </p>
                  ) : (
                    <>
                      <ScoreEvolutionChart
                        points={completedPoints}
                        language={language as 'en' | 'ro'}
                      />
                      {stats && (
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                          <div className="text-center">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              {t.currentScore[language]}
                            </div>
                            <div className={cn('text-2xl font-bold', getScoreColor(stats.latest))}>
                              {Math.round(stats.latest)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              {t.averageScore[language]}
                            </div>
                            <div className={cn('text-2xl font-bold', getScoreColor(stats.avg))}>
                              {Math.round(stats.avg)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                              {t.bestScore[language]}
                            </div>
                            <div className={cn('text-2xl font-bold', getScoreColor(stats.best))}>
                              {Math.round(stats.best)}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                {assessments.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={a.status === 'completed' ? 'default' : 'secondary'}>
                              {a.status === 'completed'
                                ? t.completed[language]
                                : t.inProgress[language]}
                            </Badge>
                            <span className="text-xs text-muted-foreground uppercase">
                              {a.language}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {a.latestScore !== null && (
                          <span
                            className={cn(
                              'text-2xl font-bold',
                              getScoreColor(a.latestScore),
                            )}
                          >
                            {Math.round(a.latestScore)}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        {a.status === 'completed' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => router.push(`/assessment/${a.id}/results`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t.viewResults[language]}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleContinue(a.id)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {t.continue[language]}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          onClick={() => setPendingDelete(a)}
                          aria-label={t.deleteBtn[language]}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="text-center">
                <Button onClick={handleStartNew}>{t.startNew[language]}</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteTitle[language]}</DialogTitle>
            <DialogDescription>{t.deleteDesc[language]}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              {t.cancel[language]}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.deleteBtn[language]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
