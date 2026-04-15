'use client';

// components/report/version-history.tsx
//  "Full version history accessible in UI"

import type { Version } from '@/lib/types/report';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { HistoryIcon } from 'lucide-react';

// Hardcoded version data for static UI
const DEMO_VERSIONS: Version[] = [
  {
    versionNumber: 3,
    createdAt: '2026-04-09T10:30:00Z',
    changeDescription: 'Updated executive summary with latest data',
    viewerUrl: '',
    pptxUrl: '',
  },
  {
    versionNumber: 2,
    createdAt: '2026-04-09T09:15:00Z',
    changeDescription: 'Added risk assessment section',
    viewerUrl: '',
    pptxUrl: '',
  },
  {
    versionNumber: 1,
    createdAt: '2026-04-09T08:00:00Z',
    changeDescription: 'Initial generation',
    viewerUrl: '',
    pptxUrl: '',
  },
];

interface VersionHistoryProps {
  currentVersion: number;
  onVersionChange: (version: number) => void;
}

export function VersionHistory({ currentVersion, onVersionChange }: VersionHistoryProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <HistoryIcon className="h-4 w-4 text-muted-foreground" />
        Version History
      </Label>
      <Select
        value={String(currentVersion)}
        onValueChange={(v) => onVersionChange(Number(v))}
      >
        <SelectTrigger id="version-selector" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEMO_VERSIONS.map((v) => (
            <SelectItem key={v.versionNumber} value={String(v.versionNumber)}>
              <div className="flex flex-col">
                <span className="text-sm">Version {v.versionNumber}</span>
                <span className="text-xs text-muted-foreground">
                  {v.changeDescription} · {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
