'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Pencil, ChevronDown, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

const KNOWN_EFFECTS = [
  { key: 'backup_score_force_zero', label: 'Force backup score to zero', type: 'boolean' },
  { key: 'final_score_cap', label: 'Cap final score at', type: 'number', placeholder: '55' },
  { key: 'final_score_penalty', label: 'Apply final score penalty', type: 'number', placeholder: '-4' },
  { key: 'monitoring_effectiveness_cap_within_category', label: 'Cap monitoring effectiveness', type: 'number', placeholder: '0.5' },
] as const;

const emptyForm = {
  gateCode: '', condition: '',
  activateQuestions: [] as string[], skipQuestions: [] as string[], setNa: '',
  categoryMultipliers: [] as { key: string; value: string }[],
  effects: { backup_score_force_zero: false, final_score_cap: '', final_score_penalty: '', monitoring_effectiveness_cap_within_category: '' },
  sortOrder: 0,
};

function buildEffectsObject(effects: typeof emptyForm.effects): Record<string, any> {
  const obj: Record<string, any> = {};
  if (effects.backup_score_force_zero) obj.backup_score_force_zero = true;
  if (effects.final_score_cap !== '') obj.final_score_cap = Number(effects.final_score_cap);
  if (effects.final_score_penalty !== '') obj.final_score_penalty = Number(effects.final_score_penalty);
  if (effects.monitoring_effectiveness_cap_within_category !== '')
    obj.monitoring_effectiveness_cap_within_category = Number(effects.monitoring_effectiveness_cap_within_category);
  return obj;
}

function parseEffectsToForm(effects: any): typeof emptyForm.effects {
  return {
    backup_score_force_zero: !!effects?.backup_score_force_zero,
    final_score_cap: effects?.final_score_cap != null ? String(effects.final_score_cap) : '',
    final_score_penalty: effects?.final_score_penalty != null ? String(effects.final_score_penalty) : '',
    monitoring_effectiveness_cap_within_category:
      effects?.monitoring_effectiveness_cap_within_category != null
        ? String(effects.monitoring_effectiveness_cap_within_category)
        : '',
  };
}

function QuestionSelector({ label, selected, onChange, questions }: {
  label: string;
  selected: string[];
  onChange: (v: string[]) => void;
  questions: any[];
}) {
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const q of questions) {
      const cat = q.category || 'gate';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(q);
    }
    return map;
  }, [questions]);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1 mb-1 min-h-[28px]">
        {selected.map(code => (
          <Badge key={code} variant="secondary" className="gap-1">
            {code}
            <button onClick={() => onChange(selected.filter(c => c !== code))} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
          </Badge>
        ))}
        {selected.length === 0 && <span className="text-xs text-muted-foreground italic">None selected</span>}
      </div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-primary underline flex items-center gap-1"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? 'Close' : 'Select questions'}
      </button>
      {open && (
        <div className="border rounded-md p-2 mt-1 max-h-48 overflow-y-auto bg-background space-y-2">
          {Array.from(grouped.entries()).map(([cat, qs]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{cat}</p>
              {qs.map((q: any) => (
                <label key={q.code} className="flex items-start gap-2 cursor-pointer hover:bg-muted px-1 py-0.5 rounded text-sm">
                  <Checkbox
                    checked={selected.includes(q.code)}
                    onCheckedChange={(checked) => {
                      onChange(checked ? [...selected, q.code] : selected.filter(c => c !== q.code));
                    }}
                    className="mt-0.5"
                  />
                  <span><span className="font-mono font-semibold">{q.code}</span>: {String(q.text_en || '').slice(0, 60)}{String(q.text_en || '').length > 60 ? '…' : ''}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleForm({ form, setForm, questions }: { form: typeof emptyForm; setForm: (f: typeof emptyForm) => void; questions: any[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Gate Code</Label><Input value={form.gateCode} onChange={e => setForm({ ...form, gateCode: e.target.value })} placeholder="G1" /></div>
        <div><Label>Condition (answer value)</Label><Input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="yes" /></div>
      </div>

      <QuestionSelector label="Activate Questions" selected={form.activateQuestions} onChange={v => setForm({ ...form, activateQuestions: v })} questions={questions} />
      <QuestionSelector label="Skip Questions" selected={form.skipQuestions} onChange={v => setForm({ ...form, skipQuestions: v })} questions={questions} />

      <div>
        <Label>Set NA Blocks (comma-separated)</Label>
        <Input value={form.setNa} onChange={e => setForm({ ...form, setNa: e.target.value })} placeholder="remote_access_block, cloud_block" />
        <p className="text-xs text-muted-foreground mt-1">Named blocks used to skip entire question groups</p>
      </div>

      <div>
        <Label className="mb-2 block">Category Multipliers</Label>
        <div className="space-y-2">
          {form.categoryMultipliers.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="flex-1" value={m.key} onChange={e => { const n = [...form.categoryMultipliers]; n[i] = { ...n[i], key: e.target.value }; setForm({ ...form, categoryMultipliers: n }); }} placeholder="risk.iam" />
              <Input className="w-24" type="number" step="0.01" value={m.value} onChange={e => { const n = [...form.categoryMultipliers]; n[i] = { ...n[i], value: e.target.value }; setForm({ ...form, categoryMultipliers: n }); }} placeholder="1.25" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, categoryMultipliers: form.categoryMultipliers.filter((_, j) => j !== i) })}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, categoryMultipliers: [...form.categoryMultipliers, { key: '', value: '' }] })}>
            <Plus className="w-3 h-3 mr-1" />Add Multiplier
          </Button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Effects</Label>
        <div className="space-y-2 border rounded-md p-3">
          {KNOWN_EFFECTS.map(effect => (
            <div key={effect.key} className="flex items-center gap-3">
              {effect.type === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={form.effects.backup_score_force_zero}
                    onCheckedChange={checked => setForm({ ...form, effects: { ...form.effects, backup_score_force_zero: !!checked } })}
                  />
                  {effect.label}
                </label>
              ) : (
                <>
                  <span className="text-sm flex-1">{effect.label}</span>
                  <Input
                    className="w-24"
                    type="number"
                    step="any"
                    placeholder={effect.placeholder}
                    value={(form.effects as any)[effect.key]}
                    onChange={e => setForm({ ...form, effects: { ...form.effects, [effect.key]: e.target.value } })}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div><Label>Sort Order</Label><Input type="number" min={0} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} /></div>
    </div>
  );
}

export default function AdminGateRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyForm });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesData, questionsData] = await Promise.all([
        api.admin.getGateRules(),
        api.admin.getQuestions(),
      ]);
      setRules(rulesData);
      setAllQuestions(questionsData.filter((q: any) => q.domain !== 'gate'));
    } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const rule of rules) {
      if (!map.has(rule.gateCode)) map.set(rule.gateCode, []);
      map.get(rule.gateCode)!.push(rule);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rules]);

  const formToPayload = (form: typeof emptyForm) => ({
    gateCode: form.gateCode,
    condition: form.condition,
    activateQuestions: form.activateQuestions,
    skipQuestions: form.skipQuestions,
    setNa: form.setNa.split(',').map(s => s.trim()).filter(Boolean),
    categoryMultipliers: Object.fromEntries(
      form.categoryMultipliers.filter(m => m.key && m.value).map(m => [m.key, Number(m.value)])
    ),
    effects: buildEffectsObject(form.effects),
    sortOrder: form.sortOrder,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createGateRule(formToPayload(createForm));
      toast.success('Gate rule created');
      setCreateOpen(false);
      setCreateForm({ ...emptyForm });
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to create rule'); }
    finally { setSaving(false); }
  };

  const openEdit = (rule: any) => {
    setEditTarget(rule);
    const catMultipliers = Object.entries(rule.categoryMultipliers ?? {}).map(([k, v]) => ({ key: k, value: String(v) }));
    setEditForm({
      gateCode: rule.gateCode,
      condition: rule.condition,
      activateQuestions: rule.activateQuestions ?? [],
      skipQuestions: rule.skipQuestions ?? [],
      setNa: (rule.setNa ?? []).join(', '),
      categoryMultipliers: catMultipliers,
      effects: parseEffectsToForm(rule.effects),
      sortOrder: rule.sortOrder,
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const { gateCode, ...payload } = formToPayload(editForm);
      await api.admin.updateGateRule(editTarget.id, { ...payload, condition: editForm.condition });
      toast.success('Gate rule updated');
      setEditOpen(false);
      setEditTarget(null);
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to update rule'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (rule: any) => {
    try {
      await api.admin.deactivateGateRule(rule.id);
      toast.success('Rule deactivated');
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to deactivate'); }
  };

  const toggleGate = (code: string) => {
    setExpandedGates(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gate Rules</h1>
          <p className="text-muted-foreground text-sm">Manage which questions are activated or skipped based on gate answers.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Rule</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Gate Rule</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <RuleForm form={createForm} setForm={setCreateForm} questions={allQuestions} />
              <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Rule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        grouped.map(([gateCode, gateRules]) => (
          <Card key={gateCode}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleGate(gateCode)}>
              <div className="flex items-center gap-3">
                {expandedGates.has(gateCode) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <CardTitle className="text-base font-mono">{gateCode}</CardTitle>
                <Badge variant="outline">{gateRules.length} rule{gateRules.length !== 1 ? 's' : ''}</Badge>
              </div>
            </CardHeader>
            {expandedGates.has(gateCode) && (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condition</TableHead>
                      <TableHead>Activates</TableHead>
                      <TableHead>Skips</TableHead>
                      <TableHead>Effects</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gateRules.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell><Badge className="font-mono">{rule.condition}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(rule.activateQuestions ?? []).length === 0
                              ? <span className="text-muted-foreground text-xs">—</span>
                              : (rule.activateQuestions as string[]).map(code => (
                                <Badge key={code} variant="secondary" className="font-mono text-xs">{code}</Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(rule.skipQuestions ?? []).length === 0
                              ? <span className="text-muted-foreground text-xs">—</span>
                              : (rule.skipQuestions as string[]).map(code => (
                                <Badge key={code} variant="outline" className="font-mono text-xs text-destructive">{code}</Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground font-mono">
                            {Object.keys(rule.effects ?? {}).length > 0
                              ? Object.entries(rule.effects).map(([k, v]) => `${k}: ${v}`).join(', ')
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Pencil className="w-4 h-4" /></Button>
                            {rule.isActive && (
                              <Button variant="outline" size="sm" onClick={() => handleDeactivate(rule)}>Deactivate</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rule: <span className="font-mono">{editTarget?.gateCode} / {editTarget?.condition}</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <RuleForm form={{ ...editForm, gateCode: editForm.gateCode }} setForm={setEditForm} questions={allQuestions} />
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
