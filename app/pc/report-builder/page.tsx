'use client';

// app/pc/report-builder/page.tsx
// Generate Report page — select section, configure, then generate.
// After clicking Generate, shows the builder view with progress → viewer → edit prompt.

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SectionSidebar } from '@/components/report/section-sidebar';
import type { SectionItem } from '@/components/report/section-sidebar';
import { PptViewer } from '@/components/report/ppt-viewer';
import { ProgressTracker } from '@/components/generate/progress-tracker';
import { CompanySelector } from '@/components/generate/company-selector';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGenerate } from '@/lib/hooks/use-generate';
import { pcService } from '@/lib/api/pc-service';
import {
  SparklesIcon,
  BuildingIcon,
  Loader2Icon,
  DownloadIcon,
  CheckIcon,
} from 'lucide-react';

// -- Hardcoded sections from section_map.json --
// The deployed backend currently only has 'Company Overview' in section_map.json.
// When Aparna merges her branch, add: { name: 'Subsidiary Deep Dive', needsSubsidiary: true }
const AVAILABLE_SECTIONS = [
  { name: 'Company Overview', needsSubsidiary: true },
] as const;

// Slug helper
function toId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

type PageView = 'configure' | 'building';

export default function ReportBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView] = useState<PageView>('configure');
  const [company, setCompany] = useState(searchParams.get('company') || '');
  const [subsidiary, setSubsidiary] = useState(searchParams.get('subsidiary') || '');
  const [selectedSection, setSelectedSection] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Generation hook — handles generate + poll lifecycle
  const {
    jobId,
    status,
    progress,
    message,
    isGenerating,
    downloadUrl,
    viewerUrl: backendViewerUrl,
    error,
    startGeneration,
    reset,
  } = useGenerate();

  // Find if selected section needs subsidiary
  const sectionConfig = AVAILABLE_SECTIONS.find((s) => s.name === selectedSection);
  const showSubsidiary = sectionConfig?.needsSubsidiary ?? false;

  // Can user click Generate?
  const canGenerate = company.trim() && selectedSection && !isGenerating
    && (!showSubsidiary || subsidiary.trim());

  // Build the viewer URL for the Office Online iframe.
  // The backend returns a raw GCS signed URL (publicly accessible).
  // Wrap it with Office Online embed if it's not already wrapped.
  const viewerUrl = (() => {
    if (backendViewerUrl) {
      if (backendViewerUrl.includes('view.officeapps.live.com')) return backendViewerUrl;
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(backendViewerUrl)}`;
    }
    return undefined;
  })();

  const activeSection = sections[activeIdx] || null;

  // When generation completes, update sidebar section status
  useEffect(() => {
    if (status === 'completed' && jobId) {
      setSections((prev) =>
        prev.map((s) =>
          s.name === selectedSection
            ? { ...s, status: 'completed', jobId }
            : s
        )
      );
    } else if (status === 'failed') {
      setSections((prev) =>
        prev.map((s) =>
          s.name === selectedSection
            ? { ...s, status: 'completed' }
            : s
        )
      );
    }
  }, [status, jobId, selectedSection]);

  // Handle Generate click
  const handleGenerate = async () => {
    if (!canGenerate) return;

    // Switch to building view
    setView('building');

    // Add section to sidebar
    const id = toId(selectedSection);
    setSections((prev) => {
      if (prev.some((s) => s.id === id)) {
        // Already exists — mark as generating
        return prev.map((s) =>
          s.id === id ? { ...s, status: 'generating' as const } : s
        );
      }
      return [...prev, { id, name: selectedSection, status: 'generating' as const }];
    });

    // Activate the section
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx >= 0) setActiveIdx(idx);
      return prev;
    });

    // Start generation
    startGeneration(company, subsidiary, selectedSection);
  };

  // Handle Refine click (re-generate with prompt)
  const handleRefine = async () => {
    if (!company || !selectedSection) return;

    // Mark as generating
    const id = toId(selectedSection);
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: 'generating' as const } : s
      )
    );

    // Re-generate with same section
    startGeneration(company, subsidiary, selectedSection);
    setPrompt('');
  };

  // ======== CONFIGURE VIEW ========
  if (view === 'configure') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Generate Report"
          description="Select a section and configure generation parameters."
        />

        {/* Company */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              Select Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompanySelector value={company} onChange={setCompany} disabled={isGenerating} />
          </CardContent>
        </Card>

        {/* Section Selection */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              Select Section
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-select" className="text-sm font-medium">Report Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger id="section-select">
                  <SelectValue placeholder="Choose a section to generate..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SECTIONS.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subsidiary field — only visible for sections that need it */}
            {showSubsidiary && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="subsidiary-input" className="text-sm font-medium flex items-center gap-2">
                  <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                  Subsidiary Name
                  <span className="text-xs text-destructive font-normal">(required for this section)</span>
                </Label>
                <Input
                  id="subsidiary-input"
                  placeholder="Enter subsidiary or segment name..."
                  value={subsidiary}
                  onChange={(e) => setSubsidiary(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Button
          id="generate-report"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full h-12 text-base font-medium gap-2"
          size="lg"
        >
          <SparklesIcon className="h-5 w-5" />
          Generate {selectedSection || 'Section'}
        </Button>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>
    );
  }

  // ======== BUILDING VIEW ========
  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <PageHeader
          title={company}
          description={`${selectedSection}${subsidiary ? ` — ${subsidiary}` : ''}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { reset(); setView('configure'); }}
          >
            ← Back to Configuration
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-border/50">
        {/* Left — Section Sidebar */}
        <div className="w-64 border-r border-border/50 bg-muted/20 flex-shrink-0">
          <SectionSidebar
            sections={sections}
            activeSection={activeSection?.id || ''}
            onSectionClick={(id) => {
              const idx = sections.findIndex((s) => s.id === id);
              if (idx >= 0) setActiveIdx(idx);
            }}
          />
        </div>

        {/* Right — Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold">{activeSection?.name || selectedSection}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status === 'completed' && '✓ Generated — review below or refine with AI'}
                {status === 'failed' && '✗ Generation failed'}
                {isGenerating && message}
                {status === 'pending' && !isGenerating && 'Ready to generate'}
              </p>
            </div>
            {/* Download button — appears after generation */}
            {downloadUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={downloadUrl} download className="gap-2">
                  <DownloadIcon className="h-4 w-4" />
                  Download PPTX
                </a>
              </Button>
            )}
          </div>

          {/* Main content area */}
          <div className="flex-1 p-4 overflow-auto">
            {isGenerating || (status !== 'completed' && status !== 'failed') ? (
              // Progress tracker during generation
              <div className="max-w-xl mx-auto mt-8">
                <ProgressTracker
                  status={status}
                  progress={progress}
                  message={message}
                  isGenerating={isGenerating}
                  jobId={jobId}
                />
              </div>
            ) : status === 'completed' && viewerUrl ? (
              // PPT Viewer after generation
              <PptViewer viewerUrl={viewerUrl} pptxUrl={downloadUrl || undefined} rawFileUrl={backendViewerUrl || undefined} />
            ) : status === 'failed' ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                  <p className="text-sm text-destructive font-medium">Generation failed</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                  <Button size="sm" onClick={handleRefine}>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Edit prompt — only after successful generation */}
          {status === 'completed' && (
            <div className="border-t border-border/50 px-6 py-4 flex-shrink-0">
              <Card className="border-border/40 bg-muted/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Refine with AI</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Describe how you want to refine the generated content. This will regenerate the section.
                  </p>
                  <Textarea
                    placeholder='e.g. "Add more financial metrics", "Make the executive summary more concise", "Include risk factors"...'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Button
                    onClick={handleRefine}
                    disabled={isGenerating}
                    className="gap-2"
                    size="sm"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Refine & Regenerate
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
