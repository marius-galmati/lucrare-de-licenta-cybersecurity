'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileQuestion, Download, FileText, ArrowRight, Link2 } from 'lucide-react';

const cards = [
  { title: 'Companies Registry', description: 'View and search all registered companies, their assessments, and scores.', icon: Building2, path: '/admin/companies', color: 'text-blue-500' },
  { title: 'Question Management', description: 'Manage assessment questions with version control and audit tracking.', icon: FileQuestion, path: '/admin/questions', color: 'text-green-500' },
  { title: 'Dedupe Pairs', description: 'Manage gate-question deduplication mappings.', icon: Link2, path: '/admin/dedupe-pairs', color: 'text-cyan-500' },
  { title: 'Exports', description: 'Generate CSV reports for companies and assessments.', icon: Download, path: '/admin/exports', color: 'text-purple-500' },
  { title: 'Audit Logs', description: 'View immutable logs of all administrative actions.', icon: FileText, path: '/admin/audit', color: 'text-orange-500' },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage CyberXscore platform data and configurations.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.path} href={card.path}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${card.color}`}><Icon className="w-6 h-6" /></div>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-4">{card.description}</CardDescription>
                  <div className="flex items-center text-primary text-sm font-medium">Go to {card.title.toLowerCase()}<ArrowRight className="w-4 h-4 ml-1" /></div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
