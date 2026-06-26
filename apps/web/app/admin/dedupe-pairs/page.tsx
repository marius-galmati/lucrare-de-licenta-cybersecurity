'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDedupePairsPage() {
  const [pairs, setPairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ gateCode: '', questionCode: '', notes: '' });

  const fetchPairs = async () => {
    setLoading(true);
    try { const data = await api.admin.getDedupePairs(); setPairs(data); } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPairs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.admin.createDedupePair(form);
      toast.success('Dedupe pair created');
      setDialogOpen(false);
      setForm({ gateCode: '', questionCode: '', notes: '' });
      fetchPairs();
    } catch (err: any) { toast.error(err.message || 'Failed to create pair'); }
    finally { setCreating(false); }
  };

  const toggleStatus = async (pair: any) => {
    const newStatus = pair.status === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateDedupePair(pair.id, { status: newStatus });
      toast.success(`Pair ${newStatus}`);
      fetchPairs();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Dedupe Pairs</h1><p className="text-muted-foreground text-sm">Gate-question deduplication mappings.</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Pair</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Dedupe Pair</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Gate Code</Label><Input value={form.gateCode} onChange={(e) => setForm(f => ({ ...f, gateCode: e.target.value }))} placeholder="G1" required /></div>
              <div><Label>Question Code</Label><Input value={form.questionCode} onChange={(e) => setForm(f => ({ ...f, questionCode: e.target.value }))} placeholder="Q7" required /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={creating}>{creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Pair</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Gate</TableHead><TableHead>Question</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {pairs.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold">{p.gateCode ?? p.gate_code}</TableCell>
                  <TableCell className="font-mono">{p.questionCode ?? p.question_code}</TableCell>
                  <TableCell><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.notes || '—'}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => toggleStatus(p)}>{p.status === 'active' ? 'Deactivate' : 'Activate'}</Button></TableCell>
                </TableRow>
              ))}
              {pairs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No dedupe pairs configured.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
