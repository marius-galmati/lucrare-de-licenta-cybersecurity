'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, Eye, Pencil, Trash2, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type Question = {
  id: string;
  code: string;
  version: number;
  status: string;
  domain: string;
  category: string;
  answerType: string;
  weightPoints: number;
  textEn: string;
  textRo: string;
  recommendationEn: string | null;
  recommendationRo: string | null;
  optionsJson: any;
  scoringInclusionRule: string | null;
  metadataJson: any;
  createdAt: string;
  versionCount?: number;
};

function formatJson(value: any): string {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ code: '', domain: 'risk', category: '', answerType: 'yes_no', weightPoints: 0, textEn: '', textRo: '', recommendationEn: '', recommendationRo: '' });

  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({ recommendationEn: '', recommendationRo: '', optionsJson: '', metadataJson: '' });
  const [editing, setEditing] = useState(false);
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const [qData, catData] = await Promise.all([api.admin.getQuestions(), api.admin.getCategories()]);
      setQuestions(qData);
      setCategories(catData.filter((c: any) => c.isActive));
    } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuestions(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.admin.createQuestion(form);
      toast.success('Question created');
      setCreateOpen(false);
      setForm({ code: '', domain: 'risk', category: '', answerType: 'yes_no', weightPoints: 0, textEn: '', textRo: '', recommendationEn: '', recommendationRo: '' });
      fetchQuestions();
    } catch (err: any) { toast.error(err.message || 'Failed to create question'); }
    finally { setCreating(false); }
  };

  const openEdit = (q: Question) => {
    setEditQuestion(q);
    setEditForm({
      recommendationEn: q.recommendationEn ?? '',
      recommendationRo: q.recommendationRo ?? '',
      optionsJson: formatJson(q.optionsJson),
      metadataJson: formatJson(q.metadataJson),
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion) return;

    let parsedOptions: any = undefined;
    let parsedMetadata: any = undefined;
    try {
      if (editForm.optionsJson.trim()) parsedOptions = JSON.parse(editForm.optionsJson);
      else parsedOptions = null;
    } catch {
      toast.error('Options JSON is not valid JSON');
      return;
    }
    try {
      if (editForm.metadataJson.trim()) parsedMetadata = JSON.parse(editForm.metadataJson);
      else parsedMetadata = null;
    } catch {
      toast.error('Metadata JSON is not valid JSON');
      return;
    }

    setEditing(true);
    try {
      await api.admin.updateQuestion(editQuestion.id, {
        recommendationEn: editForm.recommendationEn,
        recommendationRo: editForm.recommendationRo,
        optionsJson: parsedOptions,
        metadataJson: parsedMetadata,
      });
      toast.success('Question updated');
      setEditQuestion(null);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update question');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteQuestion) return;
    setDeleting(true);
    try {
      await api.admin.deleteQuestion(deleteQuestion.id);
      toast.success(`Question ${deleteQuestion.code} v${deleteQuestion.version} archived`);
      setDeleteQuestion(null);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive question');
    } finally {
      setDeleting(false);
    }
  };

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await api.admin.downloadQuestionsTemplate(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `questions-template.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download template');
    }
  };

  const handlePreview = async () => {
    if (!importFile) return;
    setPreviewing(true);
    setImportPreview(null);
    try {
      const preview = await api.admin.previewQuestionsImport(importFile);
      setImportPreview(preview);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!importFile) return;
    setCommitting(true);
    try {
      const result = await api.admin.commitQuestionsImport(importFile);
      toast.success(`Imported ${result.created} question${result.created === 1 ? '' : 's'}`);
      setImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
      fetchQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setCommitting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPreview(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Questions</h1><p className="text-muted-foreground text-sm">All versioned questions with management controls.</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Import
          </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Question</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Question</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Q61" required /></div>
                <div><Label>Domain</Label><Select value={form.domain} onValueChange={(v) => setForm(f => ({ ...f, domain: v, category: v === 'gate' ? '' : f.category }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="risk">Risk</SelectItem><SelectItem value="maturity">Maturity</SelectItem><SelectItem value="gate">Gate</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {form.domain !== 'gate' && (
                  <div><Label>Category</Label><Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((c: any) => (<SelectItem key={c.key} value={c.key}>{c.nameEn}</SelectItem>))}</SelectContent></Select></div>
                )}
                <div><Label>Answer Type</Label><Select value={form.answerType} onValueChange={(v) => setForm(f => ({ ...f, answerType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes_no">Yes/No</SelectItem><SelectItem value="scale">Scale</SelectItem><SelectItem value="multiple_choice">Multiple Choice</SelectItem><SelectItem value="yes_no_unsure">Yes/No/Unsure</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>Weight Points</Label><Input type="number" value={form.weightPoints} onChange={(e) => setForm(f => ({ ...f, weightPoints: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Text (EN)</Label><Input value={form.textEn} onChange={(e) => setForm(f => ({ ...f, textEn: e.target.value }))} required /></div>
              <div><Label>Text (RO)</Label><Input value={form.textRo} onChange={(e) => setForm(f => ({ ...f, textRo: e.target.value }))} required /></div>
              <div><Label>Recommendation (EN)</Label><Textarea value={form.recommendationEn} onChange={(e) => setForm(f => ({ ...f, recommendationEn: e.target.value }))} rows={2} /></div>
              <div><Label>Recommendation (RO)</Label><Textarea value={form.recommendationRo} onChange={(e) => setForm(f => ({ ...f, recommendationRo: e.target.value }))} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={creating}>{creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Question</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Version</TableHead><TableHead>Domain</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Weight</TableHead><TableHead>Text (EN)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-mono font-bold">{q.code}</TableCell>
                  <TableCell><Badge variant="outline">v{q.version}</Badge></TableCell>
                  <TableCell><Badge variant={q.domain === 'gate' ? 'default' : 'secondary'}>{q.domain}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{q.category}</TableCell>
                  <TableCell><Badge variant={q.status === 'active' ? 'default' : 'secondary'}>{q.status}</Badge></TableCell>
                  <TableCell>{q.weightPoints ?? 0}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{q.textEn ?? ''}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewQuestion(q)} aria-label={`View ${q.code}`}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)} aria-label={`Edit ${q.code}`}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteQuestion(q)} disabled={q.status === 'archived'} aria-label={`Archive ${q.code}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={!!viewQuestion} onOpenChange={(o) => !o && setViewQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewQuestion?.code} <Badge variant="outline" className="ml-2">v{viewQuestion?.version}</Badge></DialogTitle>
            <DialogDescription>Full question details (read-only).</DialogDescription>
          </DialogHeader>
          {viewQuestion && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Domain</Label><div><Badge variant={viewQuestion.domain === 'gate' ? 'default' : 'secondary'}>{viewQuestion.domain}</Badge></div></div>
                <div><Label className="text-muted-foreground">Status</Label><div><Badge variant={viewQuestion.status === 'active' ? 'default' : 'secondary'}>{viewQuestion.status}</Badge></div></div>
                <div><Label className="text-muted-foreground">Category</Label><div className="font-mono text-xs">{viewQuestion.category || '—'}</div></div>
                <div><Label className="text-muted-foreground">Answer Type</Label><div className="font-mono text-xs">{viewQuestion.answerType}</div></div>
                <div><Label className="text-muted-foreground">Weight Points</Label><div>{viewQuestion.weightPoints ?? 0}</div></div>
                <div><Label className="text-muted-foreground">Created</Label><div className="text-xs">{viewQuestion.createdAt ? new Date(viewQuestion.createdAt).toLocaleString() : '—'}</div></div>
              </div>
              <div><Label className="text-muted-foreground">Text (EN)</Label><div className="whitespace-pre-wrap rounded border p-2 bg-muted/40">{viewQuestion.textEn || '—'}</div></div>
              <div><Label className="text-muted-foreground">Text (RO)</Label><div className="whitespace-pre-wrap rounded border p-2 bg-muted/40">{viewQuestion.textRo || '—'}</div></div>
              <div><Label className="text-muted-foreground">Recommendation (EN)</Label><div className="whitespace-pre-wrap rounded border p-2 bg-muted/40">{viewQuestion.recommendationEn || '—'}</div></div>
              <div><Label className="text-muted-foreground">Recommendation (RO)</Label><div className="whitespace-pre-wrap rounded border p-2 bg-muted/40">{viewQuestion.recommendationRo || '—'}</div></div>
              <div><Label className="text-muted-foreground">Scoring Inclusion Rule</Label><div className="font-mono text-xs rounded border p-2 bg-muted/40">{viewQuestion.scoringInclusionRule || '—'}</div></div>
              <div><Label className="text-muted-foreground">Options JSON</Label><pre className="text-xs rounded border p-2 bg-muted/40 overflow-x-auto">{formatJson(viewQuestion.optionsJson) || '—'}</pre></div>
              <div><Label className="text-muted-foreground">Metadata JSON</Label><pre className="text-xs rounded border p-2 bg-muted/40 overflow-x-auto">{formatJson(viewQuestion.metadataJson) || '—'}</pre></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewQuestion(null)}>Close</Button>
            {viewQuestion && (
              <Button onClick={() => { const q = viewQuestion; setViewQuestion(null); openEdit(q); }}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editQuestion} onOpenChange={(o) => !o && setEditQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editQuestion?.code} <Badge variant="outline" className="ml-2">v{editQuestion?.version}</Badge></DialogTitle>
            <DialogDescription>
              Core fields (code, domain, category, answer type, weight, text) are versioned — create a new question to change them.
            </DialogDescription>
          </DialogHeader>
          {editQuestion && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label>Recommendation (EN)</Label>
                <Textarea value={editForm.recommendationEn} onChange={(e) => setEditForm(f => ({ ...f, recommendationEn: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Recommendation (RO)</Label>
                <Textarea value={editForm.recommendationRo} onChange={(e) => setEditForm(f => ({ ...f, recommendationRo: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Options JSON</Label>
                <Textarea value={editForm.optionsJson} onChange={(e) => setEditForm(f => ({ ...f, optionsJson: e.target.value }))} rows={6} className="font-mono text-xs" placeholder="null or { ... }" />
              </div>
              <div>
                <Label>Metadata JSON</Label>
                <Textarea value={editForm.metadataJson} onChange={(e) => setEditForm(f => ({ ...f, metadataJson: e.target.value }))} rows={6} className="font-mono text-xs" placeholder="null or { ... }" />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setEditQuestion(null)}>Cancel</Button>
                <Button type="submit" disabled={editing}>{editing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteQuestion} onOpenChange={(o) => !o && setDeleteQuestion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive question?</DialogTitle>
            <DialogDescription>
              {deleteQuestion && (
                <>
                  This will set <span className="font-mono font-bold">{deleteQuestion.code} v{deleteQuestion.version}</span> to <Badge variant="secondary">archived</Badge> so it stops being served in new assessments. Existing answers and audit history are preserved.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteQuestion(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) resetImport(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import questions</DialogTitle>
            <DialogDescription>
              Upload a CSV or XLSX with one question per row. Each row creates a new version when its <span className="font-mono">code</span> already exists. Download a template first to see the expected columns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground mr-2">Template:</span>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')}>
                <Download className="w-4 h-4 mr-2" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />XLSX
              </Button>
            </div>

            <div className="border rounded-md p-4 space-y-3">
              <Label>Select file (.csv or .xlsx, max 5 MB)</Label>
              <Input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null); }}
              />
              {importFile && (
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="font-mono">{importFile.name}</span> ({Math.round(importFile.size / 1024)} KB)
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handlePreview} disabled={!importFile || previewing}>
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  Preview
                </Button>
                {importFile && (
                  <Button variant="ghost" size="sm" onClick={resetImport}>Clear</Button>
                )}
              </div>
            </div>

            {importPreview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Total rows</div>
                    <div className="text-lg font-bold">{importPreview.totalRows}</div>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Valid</div>
                    <div className="text-lg font-bold text-emerald-600">{importPreview.validRows}</div>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <div className="text-xs text-muted-foreground">Errors</div>
                    <div className={`text-lg font-bold ${importPreview.invalidRows > 0 ? 'text-destructive' : ''}`}>{importPreview.invalidRows}</div>
                  </div>
                  <div className="rounded border p-2 text-center">
                    <div className="text-xs text-muted-foreground">New / Versioned</div>
                    <div className="text-lg font-bold">{importPreview.newCodes} / {importPreview.newVersions}</div>
                  </div>
                </div>

                <div className="rounded border overflow-x-auto max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Row</TableHead>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.rows.map((r: any) => (
                        <TableRow key={r.rowNumber}>
                          <TableCell className="font-mono text-xs">{r.rowNumber}</TableCell>
                          <TableCell>
                            {r.errors.length === 0
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              : <AlertCircle className="w-4 h-4 text-destructive" />}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.raw.code ?? ''}</TableCell>
                          <TableCell className="text-xs">{r.raw.domain ?? ''}</TableCell>
                          <TableCell className="text-xs">
                            {r.errors.length === 0
                              ? (r.existingCode
                                  ? <Badge variant="outline">new version v{r.nextVersion}</Badge>
                                  : <Badge variant="default">create v1</Badge>)
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-destructive">
                            {r.errors.length > 0 ? r.errors.join('; ') : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {importPreview.invalidRows > 0 && (
                  <div className="flex items-start gap-2 rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>Fix the errors in your file and upload again. Commit is disabled until every row validates.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => { setImportOpen(false); resetImport(); }} disabled={committing}>Cancel</Button>
            <Button
              onClick={handleCommit}
              disabled={!importPreview || importPreview.invalidRows > 0 || importPreview.validRows === 0 || committing}
            >
              {committing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Commit{importPreview ? ` (${importPreview.validRows})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
