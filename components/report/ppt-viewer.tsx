'use client';

// components/report/ppt-viewer.tsx
//  "Output rendered via Office viewer iframe with a signed GCS URL"

import { Button } from '@/components/ui/button';
import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from 'lucide-react';

interface PptViewerProps {
  viewerUrl?: string;
  pptxUrl?: string;
}

export function PptViewer({ viewerUrl, pptxUrl }: PptViewerProps) {
  // If no viewer URL, show placeholder
  if (!viewerUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/10 p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <FileTextIcon className="h-10 w-10 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Report Preview</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The generated report will appear here once ready
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Report Preview</p>
        <div className="flex items-center gap-2">
          {pptxUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={pptxUrl} download className="gap-2">
                <DownloadIcon className="h-4 w-4" />
                Download
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLinkIcon className="h-4 w-4" />
              Open
            </a>
          </Button>
        </div>
      </div>

      {/* Office viewer iframe */}
      <div className="flex-1 rounded-lg border border-border/50 overflow-hidden bg-white">
        <iframe
          src={viewerUrl}
          className="h-full w-full min-h-[500px]"
          title="Report Viewer"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
