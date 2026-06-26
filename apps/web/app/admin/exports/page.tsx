'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { convertToCSV, downloadCSV } from '@/lib/csvExport';

export default function AdminExportsPage() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCompanies = async () => {
    setIsExporting(true);
    try {
      const data = await api.admin.exportCompanies();
      const csv = convertToCSV(data, [
        { key: 'companyName', header: 'Company Name' },
        { key: 'primaryEmail', header: 'Primary Email' },
        { key: 'assessmentCount', header: 'Assessments' },
        { key: 'latestScore', header: 'Latest Score' },
        { key: 'latestAssessmentDate', header: 'Last Assessment' },
      ]);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csv, `cyberxscore_companies_${date}.csv`);
      toast.success('CSV exported successfully');
    } catch (err: any) { toast.error(err.message || 'Export failed'); }
    finally { setIsExporting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold">Exports</h1><p className="text-muted-foreground text-sm">Generate reports and data exports.</p></div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3"><FileSpreadsheet className="w-6 h-6 text-green-500" /><div><CardTitle>Companies Export</CardTitle><CardDescription>Export all companies with assessment counts and latest scores.</CardDescription></div></div>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportCompanies} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Export Companies CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
