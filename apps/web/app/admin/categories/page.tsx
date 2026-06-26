'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const emptyCreate = { key: '', domain: 'risk', maxPoints: 0, nameEn: '', nameRo: '', sortOrder: 99, isActive: true };
const emptyEdit = { maxPoints: 0, nameEn: '', nameRo: '', sortOrder: 0, isActive: true };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreate });

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...emptyEdit });

  const fetchCategories = async () => {
    setLoading(true);
    try { setCategories(await api.admin.getCategories()); } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createCategory(createForm);
      toast.success('Category created');
      setCreateOpen(false);
      setCreateForm({ ...emptyCreate });
      fetchCategories();
    } catch (err: any) { toast.error(err.message || 'Failed to create category'); }
    finally { setSaving(false); }
  };

  const openEdit = (cat: any) => {
    setEditTarget(cat);
    setEditForm({ maxPoints: cat.maxPoints, nameEn: cat.nameEn, nameRo: cat.nameRo, sortOrder: cat.sortOrder, isActive: cat.isActive });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.admin.updateCategory(editTarget.id, editForm);
      toast.success('Category updated');
      setEditOpen(false);
      setEditTarget(null);
      fetchCategories();
    } catch (err: any) { toast.error(err.message || 'Failed to update category'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (cat: any) => {
    try {
      await api.admin.updateCategory(cat.id, { isActive: !cat.isActive });
      toast.success(`Category ${cat.isActive ? 'deactivated' : 'activated'}`);
      fetchCategories();
    } catch (err: any) { toast.error(err.message || 'Failed to update category'); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scoring Categories</h1>
          <p className="text-muted-foreground text-sm">Manage category definitions used by the scoring engine.</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Category</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Category</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Key</Label>
                <Input value={createForm.key} onChange={(e) => setCreateForm(f => ({ ...f, key: e.target.value }))} placeholder="risk.iam" required />
                <p className="text-xs text-muted-foreground mt-1">Use dot-notation: domain.slug</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Domain</Label>
                  <Select value={createForm.domain} onValueChange={(v) => setCreateForm(f => ({ ...f, domain: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="maturity">Maturity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Points</Label>
                  <Input type="number" min={1} value={createForm.maxPoints} onChange={(e) => setCreateForm(f => ({ ...f, maxPoints: parseInt(e.target.value) || 0 }))} required />
                </div>
              </div>
              <div><Label>Name (EN)</Label><Input value={createForm.nameEn} onChange={(e) => setCreateForm(f => ({ ...f, nameEn: e.target.value }))} required /></div>
              <div><Label>Name (RO)</Label><Input value={createForm.nameRo} onChange={(e) => setCreateForm(f => ({ ...f, nameRo: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" min={0} value={createForm.sortOrder} onChange={(e) => setCreateForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={createForm.isActive ? 'active' : 'inactive'} onValueChange={(v) => setCreateForm(f => ({ ...f, isActive: v === 'active' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Category</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Max Pts</TableHead>
                <TableHead>Name (EN)</TableHead>
                <TableHead>Name (RO)</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat: any) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono text-sm">{cat.key}</TableCell>
                  <TableCell><Badge variant={cat.domain === 'risk' ? 'default' : 'secondary'}>{cat.domain}</Badge></TableCell>
                  <TableCell className="font-semibold">{cat.maxPoints}</TableCell>
                  <TableCell className="text-sm">{cat.nameEn}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.nameRo}</TableCell>
                  <TableCell>{cat.sortOrder}</TableCell>
                  <TableCell><Badge variant={cat.isActive ? 'default' : 'secondary'}>{cat.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(cat)}>{cat.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Category: {editTarget?.key}</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Points</Label>
                <Input type="number" min={1} value={editForm.maxPoints} onChange={(e) => setEditForm(f => ({ ...f, maxPoints: parseInt(e.target.value) || 0 }))} required />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" min={0} value={editForm.sortOrder} onChange={(e) => setEditForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div><Label>Name (EN)</Label><Input value={editForm.nameEn} onChange={(e) => setEditForm(f => ({ ...f, nameEn: e.target.value }))} required /></div>
            <div><Label>Name (RO)</Label><Input value={editForm.nameRo} onChange={(e) => setEditForm(f => ({ ...f, nameRo: e.target.value }))} required /></div>
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
