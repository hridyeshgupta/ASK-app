'use client';

// app/ra/history/page.tsx
//  "Full version history accessible in UI"
//  "RA members see each other's outputs"

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { EyeIcon, FilePlusIcon } from 'lucide-react';

// Hardcoded report data for static rendering
const DEMO_REPORTS = [
  { jobId: 'job-001', companyName: 'Acme Corporation', section: 'Executive Summary', status: 'completed', versions: 3, createdAt: '2026-04-09T08:00:00Z', createdBy: 'Alex Morgan' },
  { jobId: 'job-002', companyName: 'GlobalTech Industries', section: 'Financial Analysis', status: 'completed', versions: 2, createdAt: '2026-04-08T14:30:00Z', createdBy: 'Sarah Chen' },
  { jobId: 'job-003', companyName: 'Pinnacle Financial', section: 'Risk Assessment', status: 'completed', versions: 1, createdAt: '2026-04-07T11:00:00Z', createdBy: 'Alex Morgan' },
  { jobId: 'job-004', companyName: 'Vertex Holdings', section: 'Market Overview', status: 'failed', versions: 0, createdAt: '2026-04-06T09:15:00Z', createdBy: 'James Wilson' },
  { jobId: 'job-005', companyName: 'Meridian Capital', section: 'Investment Thesis', status: 'completed', versions: 4, createdAt: '2026-04-05T16:45:00Z', createdBy: 'Sarah Chen' },
];

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  completed: 'default',
  failed: 'destructive',
  pending: 'secondary',
};

export default function RAHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Report History"
        description="View all generated research Analyst reports. RA members can see each other's outputs."
        actions={
          <Button asChild className="gap-2">
            <Link href="/ra/generate">
              <FilePlusIcon className="h-4 w-4" />
              New Report
            </Link>
          </Button>
        }
      />

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Versions</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_REPORTS.map((report) => (
                <TableRow key={report.jobId} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{report.companyName}</TableCell>
                  <TableCell className="text-muted-foreground">{report.section}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[report.status] || 'secondary'} className="capitalize">
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{report.versions}</TableCell>
                  <TableCell className="text-muted-foreground">{report.createdBy}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.status === 'completed' && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ra/report/${report.jobId}`} className="gap-2">
                          <EyeIcon className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
