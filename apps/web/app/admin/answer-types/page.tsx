'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const ANSWER_TYPES = [
  { value: 'yes_no',        label: 'Yes / No' },
  { value: 'yes_no_unsure', label: 'Yes / No / Unsure' },
  { value: 'scale',         label: 'Scale' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
];

const emptyCreate = { answerType: 'yes_no', value: '', labelEn: '', labelRo: '', score: 0, sortOrder: 99, isActive: true };
const emptyEdit   = { labelEn: '', labelRo: '', score: 0, sortOrder: 0, isActive: true };

export default function AdminAnswerTypesPage() {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreate });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...emptyEdit });

  const fetchOptions = async () => {
    setLoading(true);
    try { setOptions(await api.admin.getAnswerTypeOptions()); } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOptions(); }, []);

  const grouped = ANSWER_TYPES.map(type => ({
    ...type,
    items: options.filter((o: any) => o.answerType === type.value)
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
  }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createAnswerTypeOption(createForm);
      toast.success('Option created');
      setCreateOpen(false);
      setCreateForm({ ...emptyCreate });
      fetchOptions();
    } catch (err: any) { toast.error(err.message || 'Failed to create option'); }
    finally { setSaving(false); }
  };

  const openEdit = (opt: any) => {
    setEditTarget(opt);
    setEditForm({ labelEn: opt.labelEn, labelRo: opt.labelRo, score: Number(opt.score), sortOrder: opt.sortOrder, isActive: opt.isActive });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.admin.updateAnswerTypeOption(editTarget.id, editForm);
      toast.success('Option updated');
      setEditOpen(false);
      setEditTarget(null);
      fetchOptions();
    } catch (err: any) { toast.error(err.message || 'Failed to update option'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (opt: any) => {
    try {
      await api.admin.updateAnswerTypeOption(opt.id, { isActive: !opt.isActive });
      toast.success(`Option ${opt.isActive ? 'deactivated' : 'activated'}`);
      fetchOptions();
    } catch (err: any) { toast.error(err.message || 'Failed to update option'); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Answer Types</h1>
          <p className="text-muted-foreground text-sm">Manage the options and scores for each answer type.</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Option</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Answer Option</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Answer Type</Label>
                <Select value={createForm.answerType} onValueChange={(v) => setCreateForm(f => ({ ...f, answerType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANSWER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input value={createForm.value} onChange={(e) => setCreateForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. partially" required />
                <p className="text-xs text-muted-foreground mt-1">Stored in DB — use lowercase_snake_case</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Label (EN)</Label><Input value={createForm.labelEn} onChange={(e) => setCreateForm(f => ({ ...f, labelEn: e.target.value }))} required /></div>
                <div><Label>Label (RO)</Label><Input value={createForm.labelRo} onChange={(e) => setCreateForm(f => ({ ...f, labelRo: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Score (0 – 1)</Label>
                  <Input type="number" min={0} max={1} step={0.001} value={createForm.score} onChange={(e) => setCreateForm(f => ({ ...f, score: parseFloat(e.target.value) || 0 }))} required />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" min={0} value={createForm.sortOrder} onChange={(e) => setCreateForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Add Option</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        grouped.map(type => (
          <Card key={type.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{type.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value</TableHead>
                    <TableHead>Label (EN)</TableHead>
                    <TableHead>Label (RO)</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {type.items.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">No options defined</TableCell></TableRow>
                  ) : type.items.map((opt: any) => (
                    <TableRow key={opt.id}>
                      <TableCell className="font-mono text-sm">{opt.value}</TableCell>
                      <TableCell>{opt.labelEn}</TableCell>
                      <TableCell className="text-muted-foreground">{opt.labelRo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{Number(opt.score).toFixed(3)}</Badge>
                      </TableCell>
                      <TableCell>{opt.sortOrder}</TableCell>
                      <TableCell><Badge variant={opt.isActive ? 'default' : 'secondary'}>{opt.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(opt)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => toggleActive(opt)}>{opt.isActive ? 'Deactivate' : 'Activate'}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog de editare */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit: <span className="font-mono">{editTarget?.answerType} / {editTarget?.value}</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Label (EN)</Label><Input value={editForm.labelEn} onChange={(e) => setEditForm(f => ({ ...f, labelEn: e.target.value }))} required /></div>
              <div><Label>Label (RO)</Label><Input value={editForm.labelRo} onChange={(e) => setEditForm(f => ({ ...f, labelRo: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Score (0 – 1)</Label>
                <Input type="number" min={0} max={1} step={0.001} value={editForm.score} onChange={(e) => setEditForm(f => ({ ...f, score: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" min={0} value={editForm.sortOrder} onChange={(e) => setEditForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.isActive ? 'active' : 'inactive'} onValueChange={(v) => setEditForm(f => ({ ...f, isActive: v === 'active' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
