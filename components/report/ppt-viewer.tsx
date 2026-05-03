'use client';

// components/report/ppt-viewer.tsx
// Inline PPT viewer using Google Docs Viewer for reliable iframe rendering.
// Office Online embed (view.officeapps.live.com) crashes inside iframes with
// GCS signed URLs (ViewPreview/appChrome ReferenceErrors). Google Docs Viewer
// handles these URLs without issue.
// The "Open in new tab" button still uses the Office Online URL which works
// fine in a full browser tab.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DownloadIcon, ExternalLinkIcon, FileTextIcon, Loader2Icon, AlertCircleIcon, RefreshCwIcon } from 'lucide-react';

interface PptViewerProps {
  viewerUrl?: string;    // Office Online URL (for "Open in new tab")
  pptxUrl?: string;      // Download URL (proxy endpoint)
  rawFileUrl?: string;   // Raw GCS signed URL (for inline Google Docs Viewer)
}

export function PptViewer({ viewerUrl, pptxUrl, rawFileUrl }: PptViewerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // If no viewer URL at all, show placeholder
  if (!viewerUrl && !rawFileUrl) {
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

  // Build inline viewer URL using Google Docs Viewer for reliable inline rendering.
  // Office Online embed fails inside iframes with GCS signed URLs
  // (throws ViewPreview / appChrome ReferenceErrors in BootViewDS.js).
  const inlineUrl = rawFileUrl
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawFileUrl)}`
    : viewerUrl;

  const handleRetry = () => {
    setIframeLoaded(false);
    setIframeError(false);
    setRetryKey((k) => k + 1);
  };

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
          {viewerUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={viewerUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLinkIcon className="h-4 w-4" />
                Open
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Inline viewer iframe */}
      <div className="flex-1 rounded-lg border border-border/50 overflow-hidden bg-white relative min-h-[500px]">
        {/* Loading overlay */}
        {!iframeLoaded && !iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary/40" />
            <p className="text-sm text-muted-foreground">Loading presentation…</p>
          </div>
        )}

        {/* Error fallback */}
        {iframeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/5 z-10">
            <AlertCircleIcon className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Unable to load inline preview</p>
              <p className="text-xs text-muted-foreground">
                Use the buttons above to download or open in a new tab.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
              <RefreshCwIcon className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {inlineUrl && !iframeError && (
          <iframe
            key={retryKey}
            src={inlineUrl}
            className="h-full w-full"
            title="Report Viewer"
            allowFullScreen
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
          />
        )}
      </div>
    </div>
  );
}
