'use client';

// app/pc/generate/page.tsx
// PPT Agent generate page — three separate upload zones matching backend file categories

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { CompanySelector } from '@/components/generate/company-selector';
import { PromptInput } from '@/components/generate/prompt-input';
import { ProgressTracker } from '@/components/generate/progress-tracker';
import { FileUploadZone } from '@/components/upload/file-upload-zone';
import { useUpload } from '@/lib/hooks/use-upload';
import type { UploadedFile } from '@/lib/hooks/use-upload';
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
import { REPORT_SECTIONS } from '@/lib/constants';
import {
  SparklesIcon,
  BuildingIcon,
  UploadCloudIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XIcon,
  FileTextIcon,
  TableIcon,
  FileIcon,
} from 'lucide-react';

// Small inline file list for each upload zone
function MiniFileList({ files, onRemove, disabled }: { files: UploadedFile[]; onRemove: (id: string) => void; disabled: boolean }) {
  if (files.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {files.map((f) => (
        <div key={f.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <span className="truncate max-w-[280px]">{f.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
            {!disabled && (
              <button onClick={() => onRemove(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PCGeneratePage() {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [subsidiary, setSubsidiary] = useState('');
  const [section, setSection] = useState('');
  const [prompt, setPrompt] = useState('');
  const {
    presentations,
    financials,
    otherDocs,
    totalFiles,
    isUploading,
    uploadError,
    uploadSuccess,
    addPresentations,
    addFinancials,
    addOtherDocs,
    removeFile,
    uploadDocuments,
  } = useUpload();
  const { status, progress, message, isGenerating, jobId, error, startGeneration } = useGenerate();

  const isBusy = isGenerating || isUploading;
  const canUpload = company && presentations.length > 0 && financials.length > 0 && !isBusy;
  const canGenerate = company && section && uploadSuccess && !isGenerating;

  const handleUpload = async () => {
    try {
      await uploadDocuments(company);
    } catch {
      // Error is set in the hook
    }
  };

  const handleGenerate = () => {
    startGeneration(company, subsidiary, section);
  };

  const handleViewReport = () => {
    router.push(`/pc/report/${jobId || 'demo-job'}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Generate Report"
        description="Select a company, upload documents, and generate an AI-powered private credit analysis report."
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
          <CompanySelector value={company} onChange={setCompany} disabled={isBusy} />
          <div className="space-y-2">
            <Label htmlFor="pc-subsidiary-input" className="text-sm font-medium flex items-center gap-2">
              <BuildingIcon className="h-4 w-4 text-muted-foreground" />
              Subsidiary Name
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="pc-subsidiary-input"
              placeholder="Enter subsidiary name..."
              value={subsidiary}
              onChange={(e) => setSubsidiary(e.target.value)}
              disabled={isBusy}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Upload Documents (three zones) */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Investor Presentations (PDFs) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileTextIcon className="h-4 w-4 text-red-500" />
              <Label className="text-sm font-medium">Investor Presentations</Label>
              <span className="text-xs text-muted-foreground">(PDF files — required)</span>
            </div>
            <FileUploadZone
              onFilesSelected={addPresentations}
              disabled={isBusy}
              label="Drop PDF files here"
              description="Annual reports, investor decks, presentations"
              accept=".pdf"
              id="upload-presentations"
            />
            <MiniFileList files={presentations} onRemove={removeFile} disabled={isBusy} />
          </div>

          {/* Financial Models (Excel) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TableIcon className="h-4 w-4 text-green-500" />
              <Label className="text-sm font-medium">Financial Models</Label>
              <span className="text-xs text-muted-foreground">(Excel files — required)</span>
            </div>
            <FileUploadZone
              onFilesSelected={addFinancials}
              disabled={isBusy}
              label="Drop Excel files here"
              description="Financial models, spreadsheets (.xlsx, .xls, .csv)"
              accept=".xlsx,.xls,.csv"
              id="upload-financials"
            />
            <MiniFileList files={financials} onRemove={removeFile} disabled={isBusy} />
          </div>

          {/* Other Documents (optional) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileIcon className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-medium">Other Documents</Label>
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
            <FileUploadZone
              onFilesSelected={addOtherDocs}
              disabled={isBusy}
              label="Drop any other supporting docs here"
              description="Word documents, additional reference files (.docx, .pdf, etc.)"
              accept=".pdf,.docx,.doc,.txt"
              id="upload-other"
            />
            <MiniFileList files={otherDocs} onRemove={removeFile} disabled={isBusy} />
          </div>

          {/* Upload button */}
          {totalFiles > 0 && (
            <div className="space-y-2 pt-2">
              <Button
                id="pc-upload-docs"
                onClick={handleUpload}
                disabled={!canUpload}
                variant={uploadSuccess ? 'outline' : 'default'}
                className="w-full h-11 text-base font-medium gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2Icon className="h-5 w-5 animate-spin" />
                    Uploading & Pre-processing...
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle2Icon className="h-5 w-5 text-emerald-500" />
                    {totalFiles} Document{totalFiles !== 1 ? 's' : ''} Uploaded Successfully
                  </>
                ) : (
                  <>
                    <UploadCloudIcon className="h-5 w-5" />
                    Upload {totalFiles} Document{totalFiles !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              {uploadError && (
                <p className="text-sm text-destructive text-center">{uploadError}</p>
              )}
              {!uploadSuccess && presentations.length === 0 && (
                <p className="text-xs text-amber-500 text-center">⚠ Add at least one PDF to Investor Presentations</p>
              )}
              {!uploadSuccess && financials.length === 0 && (
                <p className="text-xs text-amber-500 text-center">⚠ Add at least one Excel file to Financial Models</p>
              )}
            </div>
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
            <Label htmlFor="pc-section-selector" className="text-sm font-medium">Report Section</Label>
            <Select value={section} onValueChange={setSection} disabled={isGenerating}>
              <SelectTrigger id="pc-section-selector">
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
            id="pc-generate-report"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-11 text-base font-medium gap-2"
            size="lg"
          >
            <SparklesIcon className="h-5 w-5" />
            {!uploadSuccess ? 'Upload Documents First' : 'Generate Report'}
          </Button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
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
