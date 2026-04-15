'use client';

// app/ra/dashboard/page.tsx
// Landing page for RA module
//  Implied by module routing — landing page for each module

import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FilePlusIcon,
  FileTextIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  TrendingUpIcon,
} from 'lucide-react';

// Hardcoded recent reports
const RECENT_REPORTS = [
  { jobId: 'job-001', companyName: 'Acme Corporation', section: 'Executive Summary', status: 'completed', createdAt: '2026-04-09T08:00:00Z' },
  { jobId: 'job-002', companyName: 'GlobalTech Industries', section: 'Financial Analysis', status: 'completed', createdAt: '2026-04-08T14:30:00Z' },
  { jobId: 'job-003', companyName: 'Pinnacle Financial', section: 'Risk Assessment', status: 'completed', createdAt: '2026-04-07T11:00:00Z' },
];

export default function RADashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}`}
        description="Research Analyst module: Your AI-powered analysis hub."
        actions={
          <Button asChild className="gap-2">
            <Link href="/ra/generate">
              <FilePlusIcon className="h-4 w-4" />
              Generate New Report
            </Link>
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Reports</p>
                <p className="mt-1 text-3xl font-bold">24</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                <FileTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week</p>
                <p className="mt-1 text-3xl font-bold">7</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <CardDescription>Your latest generated reports</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ra/history" className="gap-1">
              View all
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {RECENT_REPORTS.map((report) => (
            <Link
              key={report.jobId}
              href={`/ra/report/${report.jobId}`}
              className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50 group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                <FileTextIcon className="h-5 w-5 text-primary/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{report.companyName}</p>
                <p className="text-xs text-muted-foreground">{report.section}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="mr-1 h-3 w-3" />
                  {report.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
