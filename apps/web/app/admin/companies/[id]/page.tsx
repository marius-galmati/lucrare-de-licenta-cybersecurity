'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await api.admin.getCompanyById(companyId);
        setData(result);
      } catch { /* eroare gestionată */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [companyId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!data) return <div className="text-center py-12 text-muted-foreground">Company not found.</div>;

  const { company, profiles, assessments } = data;

  return (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" className="mb-4" onClick={() => router.push('/admin/companies')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Companies</Button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" />{company.name}</h1>
        <p className="text-muted-foreground">{company.primaryEmail}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card><CardHeader><CardTitle className="text-lg">Profiles ({profiles.length})</CardTitle></CardHeader><CardContent>
          {profiles.map((p: any) => (<div key={p.id} className="py-2 border-b last:border-0"><span className="text-sm">{p.email}</span> <span className="text-xs text-muted-foreground ml-2">{p.companyName}</span></div>))}
          {profiles.length === 0 && <p className="text-sm text-muted-foreground">No profiles linked.</p>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-lg">Assessment Summary</CardTitle></CardHeader><CardContent>
          <p className="text-sm">Total assessments: <span className="font-bold">{assessments.length}</span></p>
          <p className="text-sm">Completed: <span className="font-bold">{assessments.filter((a: any) => a.status === 'completed').length}</span></p>
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-lg">Assessments</CardTitle></CardHeader><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Status</TableHead><TableHead>Language</TableHead><TableHead>Score</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>
            {assessments.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.id.slice(0, 8)}...</TableCell>
                <TableCell><Badge variant={a.status === 'completed' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                <TableCell>{a.language?.toUpperCase()}</TableCell>
                <TableCell className="font-bold">{a.latestScore !== null ? Math.round(a.latestScore) : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
