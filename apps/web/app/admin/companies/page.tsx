'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, X } from 'lucide-react';

type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'excellent';

const RISK_LEVELS: { value: RiskLevel; label: string; range: string }[] = [
  { value: 'critical', label: 'Critical', range: '< 20' },
  { value: 'high', label: 'High risk', range: '20 – 39' },
  { value: 'medium', label: 'Medium', range: '40 – 59' },
  { value: 'low', label: 'Low risk', range: '60 – 79' },
  { value: 'excellent', label: 'Excellent', range: '80+' },
];

const ANY_VALUE = '__any__';

const riskBadgeClasses: Record<RiskLevel, string> = {
  critical: 'bg-red-600 text-white hover:bg-red-600',
  high: 'bg-orange-500 text-white hover:bg-orange-500',
  medium: 'bg-yellow-500 text-black hover:bg-yellow-500',
  low: 'bg-lime-500 text-black hover:bg-lime-500',
  excellent: 'bg-emerald-600 text-white hover:bg-emerald-600',
};

function riskLabel(level: RiskLevel | null | undefined): string {
  if (!level) return '—';
  return RISK_LEVELS.find((r) => r.value === level)?.label ?? level;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [riskLevel, setRiskLevel] = useState<string>('');
  const [questionCode, setQuestionCode] = useState<string>('');
  const [answerValue, setAnswerValue] = useState<string>('');

  const [questions, setQuestions] = useState<any[]>([]);
  const [answerTypeOptions, setAnswerTypeOptions] = useState<any[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const fetchData = async (overrides?: { page?: number }) => {
    setLoading(true);
    try {
      const result = await api.admin.getCompanies({
        search,
        page: overrides?.page ?? page,
        limit: 20,
        riskLevel: riskLevel || undefined,
        questionCode: questionCode || undefined,
        answerValue: answerValue || undefined,
      });
      setData(result);
    } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      setFiltersLoading(true);
      try {
        const [qs, opts] = await Promise.all([
          api.admin.getQuestions(),
          api.admin.getAnswerTypeOptions(),
        ]);
        setQuestions((qs as any[]).filter((q) => q.status === 'active'));
        setAnswerTypeOptions(opts as any[]);
      } catch { /* eroare gestionată */ }
      finally { setFiltersLoading(false); }
    })();
  }, []);

  useEffect(() => { fetchData(); }, [page]);

  useEffect(() => {
    setPage(1);
    fetchData({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskLevel, questionCode, answerValue]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData({ page: 1 });
  };

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.code === questionCode) ?? null,
    [questions, questionCode],
  );

  const answerChoices = useMemo<{ value: string; label: string }[]>(() => {
    if (!selectedQuestion) return [];
    const at: string = selectedQuestion.answerType;
    const fromOptionsJson = (() => {
      const opts = selectedQuestion.optionsJson;
      if (!opts) return [];
      if (Array.isArray(opts)) {
        return opts
          .map((o: any) => {
            const value = String(o.value ?? o.key ?? o.id ?? '');
            if (!value) return null;
            const label = String(o.labelEn ?? o.label_en ?? o.label ?? value);
            return { value, label };
          })
          .filter((x): x is { value: string; label: string } => !!x);
      }
      if (typeof opts === 'object') {
        return Object.entries(opts as Record<string, any>).map(([k, v]) => ({
          value: k,
          label: typeof v === 'string' ? v : (v?.labelEn ?? v?.label ?? k),
        }));
      }
      return [];
    })();
    if (fromOptionsJson.length > 0) return fromOptionsJson;

    return answerTypeOptions
      .filter((o) => o.answerType === at && o.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((o) => ({ value: String(o.value), label: String(o.labelEn ?? o.value) }));
  }, [selectedQuestion, answerTypeOptions]);

  const clearFilters = () => {
    setRiskLevel('');
    setQuestionCode('');
    setAnswerValue('');
  };

  const anyFilterActive = !!(riskLevel || questionCode || answerValue);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Companies</h1><p className="text-muted-foreground text-sm">All registered companies and their assessment data.</p></div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Risk level (latest score)</Label>
              <Select
                value={riskLevel === '' ? ANY_VALUE : riskLevel}
                onValueChange={(v) => setRiskLevel(v === ANY_VALUE ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Any risk level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>Any risk level</SelectItem>
                  {RISK_LEVELS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label} <span className="text-muted-foreground text-xs">({r.range})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Question</Label>
              <Select
                value={questionCode === '' ? ANY_VALUE : questionCode}
                onValueChange={(v) => {
                  if (v === ANY_VALUE) {
                    setQuestionCode('');
                    setAnswerValue('');
                  } else {
                    setQuestionCode(v);
                    setAnswerValue('');
                  }
                }}
                disabled={filtersLoading}
              >
                <SelectTrigger><SelectValue placeholder={filtersLoading ? 'Loading…' : 'Any question'} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={ANY_VALUE}>Any question</SelectItem>
                  {questions.map((q) => (
                    <SelectItem key={q.id} value={q.code}>
                      <span className="font-mono text-xs mr-2">{q.code}</span>
                      <span className="truncate">{q.textEn}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Answer value</Label>
              <Select
                value={answerValue === '' ? ANY_VALUE : answerValue}
                onValueChange={(v) => setAnswerValue(v === ANY_VALUE ? '' : v)}
                disabled={!questionCode || answerChoices.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!questionCode ? 'Select a question first' : 'Any answer'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>Any answer</SelectItem>
                  {answerChoices.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {anyFilterActive && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Profiles</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Latest Score</TableHead>
                  <TableHead>Last Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data || []).map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/companies/${c.id}`)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.primaryEmail}</TableCell>
                    <TableCell>{c.profileCount}</TableCell>
                    <TableCell>{c.assessmentCount}</TableCell>
                    <TableCell>
                      {c.latestScore !== null && c.latestScore !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{Math.round(c.latestScore)}</span>
                          {c.riskLevel && (
                            <Badge className={riskBadgeClasses[c.riskLevel as RiskLevel]}>
                              {riskLabel(c.riskLevel)}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.lastCompletedAt ? new Date(c.lastCompletedAt).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {(data?.data || []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No companies match these filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground py-2">Page {page} of {data.totalPages} · {data.total} total</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
