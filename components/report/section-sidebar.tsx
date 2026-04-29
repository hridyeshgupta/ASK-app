'use client';

// components/report/section-sidebar.tsx
// Left sidebar showing sections from backend manifest.
// No manual adding — only shows what the backend provides.
// Sections can be in: completed (from manifest), generating (live), or finalized (user-approved).

import { cn } from '@/lib/utils';
import {
  CheckCircle2Icon,
  Loader2Icon,
  CircleDotIcon,
} from 'lucide-react';

export type SectionStatus = 'generating' | 'completed' | 'finalized';

export interface SectionItem {
  id: string;
  name: string;
  status: SectionStatus;
  jobId?: string;
  progress?: number;
}

interface SectionSidebarProps {
  sections: SectionItem[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

const statusConfig: Record<SectionStatus, { icon: React.ElementType; color: string; label: string }> = {
  generating: { icon: Loader2Icon, color: 'text-amber-500', label: 'Generating...' },
  completed: { icon: CircleDotIcon, color: 'text-blue-500', label: 'Ready' },
  finalized: { icon: CheckCircle2Icon, color: 'text-emerald-500', label: 'Finalized' },
};

export function SectionSidebar({ sections, activeSection, onSectionClick }: SectionSidebarProps) {
  const completedCount = sections.filter((s) => s.status === 'completed' || s.status === 'finalized').length;
  const generatingCount = sections.filter((s) => s.status === 'generating').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <p className="text-sm font-semibold">Sections</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {completedCount} ready{generatingCount > 0 ? ` · ${generatingCount} generating` : ''}
        </p>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sections.length === 0 && (
          <p className="px-4 py-6 text-xs text-muted-foreground text-center">
            No sections yet. Enter a section name and click Generate to start.
          </p>
        )}
        {sections.map((section) => {
          const config = statusConfig[section.status];
          const StatusIcon = config.icon;
          const isActive = section.id === activeSection;

          return (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                  : 'hover:bg-muted/50 text-foreground/80 border-l-2 border-transparent'
              )}
            >
              <StatusIcon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isActive ? 'text-primary' : config.color,
                  section.status === 'generating' && 'animate-spin'
                )}
              />
              <div className="flex-1 min-w-0">
                <span className="truncate block">{section.name}</span>
                {section.status === 'generating' && (
                  <span className="text-xs text-amber-500">Generating...</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
