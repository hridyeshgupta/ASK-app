'use client';

// components/generate/progress-tracker.tsx
//  "frontend polls GET /status/:job_id every ~3s for progress"

import type { JobStatus } from '@/lib/types/report';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2Icon,
  Loader2Icon,
  XCircleIcon,
  FileSearchIcon,
  BrainCircuitIcon,
  LayoutIcon,
  UploadCloudIcon,
  ClockIcon,
  ExternalLinkIcon,
} from 'lucide-react';

interface ProgressTrackerProps {
  status: JobStatus;
  progress: number;
  message: string;
  isGenerating: boolean;
  jobId: string | null;
  onViewReport?: () => void;
}

const statusConfig: Record<JobStatus, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: ClockIcon, label: 'Queued', color: 'text-muted-foreground' },
  generating: { icon: Loader2Icon, label: 'Generating', color: 'text-indigo-500' },
  extracting: { icon: FileSearchIcon, label: 'Extracting Data', color: 'text-blue-500' },
  planning: { icon: BrainCircuitIcon, label: 'Planning Structure', color: 'text-purple-500' },
  building_slides: { icon: LayoutIcon, label: 'Building Slides', color: 'text-amber-500' },
  uploading: { icon: UploadCloudIcon, label: 'Uploading', color: 'text-cyan-500' },
  processing: { icon: Loader2Icon, label: 'Processing', color: 'text-orange-500' },
  completed: { icon: CheckCircle2Icon, label: 'Completed', color: 'text-emerald-500' },
  failed: { icon: XCircleIcon, label: 'Failed', color: 'text-destructive' },
};

const PHASES: JobStatus[] = ['extracting', 'planning', 'building_slides', 'uploading', 'completed'];

export function ProgressTracker({
  status,
  progress,
  message,
  isGenerating,
  jobId,
  onViewReport,
}: ProgressTrackerProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {isGenerating ? (
            <Loader2Icon className={`h-5 w-5 animate-spin ${config.color}`} />
          ) : (
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
          )}
          <div>
            <p className="text-sm font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{progress}%</p>
        </div>

        {/* Pipeline phases */}
        <div className="flex items-center justify-between gap-1">
          {PHASES.map((phase) => {
            const phaseConfig = statusConfig[phase];
            const PhaseIcon = phaseConfig.icon;
            const phaseIndex = PHASES.indexOf(phase);
            const currentIndex = PHASES.indexOf(status);
            const isCompleted = currentIndex > phaseIndex || status === 'completed';
            const isCurrent = phase === status;

            return (
              <div
                key={phase}
                className={`flex flex-col items-center gap-1 flex-1 ${isCompleted ? 'text-emerald-500' : isCurrent ? config.color : 'text-muted-foreground/40'
                  }`}
              >
                <PhaseIcon className="h-4 w-4" />
                <span className="text-[10px] font-medium text-center leading-tight">
                  {phaseConfig.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* View Report button */}
        {status === 'completed' && onViewReport && (
          <Button onClick={onViewReport} className="w-full gap-2" id="view-report">
            <ExternalLinkIcon className="h-4 w-4" />
            View Report
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
