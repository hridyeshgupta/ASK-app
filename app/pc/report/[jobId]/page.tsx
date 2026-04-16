'use client';

// app/pc/report/[jobId]/page.tsx
// Report view — fetches job status, displays PPT in viewer, allows prompt-based refinement

import { useState, useEffect, use } from 'react';
import { pcService } from '@/lib/api/pc-service';
import type { StatusResponse } from '@/lib/api/pc-service';
import { useChat } from '@/lib/hooks/use-chat';
import { PptViewer } from '@/components/report/ppt-viewer';
import { ChatPanel } from '@/components/report/chat-panel';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, Loader2Icon, DownloadIcon } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default function PCReportPage({ params }: PageProps) {
  const { jobId } = use(params);
  const [jobData, setJobData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { messages, isLoading: isChatLoading, sendMessage } = useChat(jobId);

  // Fetch job status on mount
  useEffect(() => {
    async function fetchJobStatus() {
      try {
        const response = await pcService.pollStatus(jobId);
        setJobData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }

    if (jobId && jobId !== 'demo-job') {
      fetchJobStatus();
    } else {
      setLoading(false);
    }
  }, [jobId]);

  const downloadUrl = jobData?.pptx_path ? pcService.getDownloadUrl(jobId) : null;

  // Build the Office viewer URL from the download URL
  // Office Online viewer needs a publicly accessible URL
  const viewerUrl = downloadUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`
    : undefined;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pc/generate">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title="Report View"
            description={
              jobData
                ? `${jobData.job_id.slice(0, 8)}… — ${jobData.message}`
                : 'Loading report...'
            }
          />
        </div>
        {downloadUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={downloadUrl} download className="gap-2">
              <DownloadIcon className="h-4 w-4" />
              Download PPTX
            </a>
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" asChild>
              <Link href="/pc/generate">Back to Generate</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden rounded-xl border border-border/50">
          {/* Left Panel — PPT Viewer */}
          <div className="flex-1 p-4">
            <PptViewer
              viewerUrl={viewerUrl}
              pptxUrl={downloadUrl || undefined}
            />
          </div>

          {/* Right Panel — Chat / Prompt refinement */}
          <div className="w-96 border-l border-border/50 flex flex-col">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isChatLoading}
              isGenerating={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
