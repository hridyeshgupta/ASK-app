'use client';

// app/pc/report/[jobId]/page.tsx
// Same structure as RA report view

import { useState } from 'react';
import { useChat } from '@/lib/hooks/use-chat';
import { PptViewer } from '@/components/report/ppt-viewer';
import { ChatPanel } from '@/components/report/chat-panel';
import { VersionHistory } from '@/components/report/version-history';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export default function PCReportPage() {
  const [currentVersion, setCurrentVersion] = useState(3);
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pc/history">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Report View"
          description="GlobalTech Industries — Financial Analysis"
        />
      </div>

      {/* Version selector */}
      <div className="max-w-xs">
        <VersionHistory currentVersion={currentVersion} onVersionChange={setCurrentVersion} />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-xl border border-border/50">
        {/* Left Panel — PPT Viewer */}
        <div className="flex-1 p-4">
          <PptViewer />
        </div>

        {/* Right Panel — Chat */}
        <div className="w-96 border-l border-border/50 flex flex-col">
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            isGenerating={false}
          />
        </div>
      </div>
    </div>
  );
}
