'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Loader2 } from 'lucide-react';

const actionTypeLabels: Record<string, string> = {
  'question_created': 'Question Created',
  'question_updated': 'Question Updated',
  'dedupe_pair_created': 'Dedupe Pair Created',
  'dedupe_pair_updated': 'Dedupe Pair Updated',
  'migration_run': 'Migration Run',
  'QUESTION_CREATE': 'Question Created',
  'QUESTION_VERSION_CREATE': 'Question Version',
  'EXPORT_CSV': 'CSV Export',
};

export default function AdminAuditLogsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 25 };
      if (actionType && actionType !== 'all') params.actionType = actionType;
      const result = await api.admin.getAuditLogs(params);
      setData(result);
    } catch { /* eroare gestionată */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, actionType]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-muted-foreground text-sm">Immutable log of all administrative actions.</p></div>
      <div className="mb-4 flex gap-4">
        <Select value={actionType} onValueChange={(v) => { setActionType(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="question_created">Question Created</SelectItem>
            <SelectItem value="question_updated">Question Updated</SelectItem>
            <SelectItem value="dedupe_pair_created">Dedupe Pair Created</SelectItem>
            <SelectItem value="migration_run">Migration Run</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Entity ID</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.data || []).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{log.userEmail || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{actionTypeLabels[log.actionType] || log.actionType}</Badge></TableCell>
                  <TableCell className="text-sm">{log.entityType}</TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId ? `${log.entityId.slice(0, 8)}...` : '—'}</TableCell>
                </TableRow>
              ))}
              {(data?.data || []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground py-2">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
