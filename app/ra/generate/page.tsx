'use client';

// app/ra/generate/page.tsx
//  "select company → pick + upload docs with hierarchy → optional prompt → generate → view output"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { CompanySelector } from '@/components/generate/company-selector';
import { PromptInput } from '@/components/generate/prompt-input';
import { ProgressTracker } from '@/components/generate/progress-tracker';
import { FileUploadZone } from '@/components/upload/file-upload-zone';
import { DocList } from '@/components/upload/doc-list';
import { DocRankList } from '@/components/upload/doc-rank-list';
import { useUpload } from '@/lib/hooks/use-upload';
import { useGenerate } from '@/lib/hooks/use-generate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { REPORT_SECTIONS } from '@/lib/constants';
import { SparklesIcon, BuildingIcon } from 'lucide-react';

export default function RAGeneratePage() {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [subsidiary, setSubsidiary] = useState('');
  const [section, setSection] = useState('');
  const [prompt, setPrompt] = useState('');
  const { documents, addFiles, removeDocument, toggleHierarchy, reorderDocuments } = useUpload();
  const { status, progress, message, isGenerating, jobId, startGeneration } = useGenerate();

  const canGenerate = company && section && documents.length > 0 && !isGenerating;

  const handleGenerate = () => {
    startGeneration();
  };

  const handleViewReport = () => {
    router.push(`/ra/report/${jobId || 'demo-job'}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Generate Report"
        description="Select a company, upload documents, and generate an AI-powered research Analyst report."
      />

      {/* Step 1 — Select Company */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Select Company
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CompanySelector value={company} onChange={setCompany} disabled={isGenerating} />
          <div className="space-y-2">
            <Label htmlFor="subsidiary-input" className="text-sm font-medium flex items-center gap-2">
              <BuildingIcon className="h-4 w-4 text-muted-foreground" />
              Subsidiary Name
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="subsidiary-input"
              placeholder="Enter subsidiary name..."
              value={subsidiary}
              onChange={(e) => setSubsidiary(e.target.value)}
              disabled={isGenerating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Upload & Rank Documents */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Upload & Rank Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploadZone onFilesSelected={addFiles} disabled={isGenerating} />
          <DocList documents={documents} onRemove={removeDocument} onToggleHierarchy={toggleHierarchy} />
          {documents.length > 1 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Document Ranking</p>
                <p className="text-xs text-muted-foreground">
                  Drag to reorder — ranking is passed as weighted context to the agent.
                </p>
                <DocRankList documents={documents} onReorder={reorderDocuments} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 3 — Configure & Generate */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            Configure & Generate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-selector" className="text-sm font-medium">Report Section</Label>
            <Select value={section} onValueChange={setSection} disabled={isGenerating}>
              <SelectTrigger id="section-selector">
                <SelectValue placeholder="Select section..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PromptInput value={prompt} onChange={setPrompt} disabled={isGenerating} />

          <Button
            id="generate-report"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-11 text-base font-medium gap-2"
            size="lg"
          >
            <SparklesIcon className="h-5 w-5" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Step 4 — Progress */}
      {(isGenerating || status === 'completed' || status === 'failed') && (
        <ProgressTracker
          status={status}
          progress={progress}
          message={message}
          isGenerating={isGenerating}
          jobId={jobId}
          onViewReport={handleViewReport}
        />
      )}
    </div>
  );
}
