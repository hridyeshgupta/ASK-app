'use client';

// app/pc/report-generation/page.tsx
// 4-Step Stepper page — replaces old separate Upload + Generate pages.
//
// Pranavi's design:
//   Step 1: Company Onboarding — company name (react-select Creatable) + company presentations
//   Step 2: Additional Documents — financial models + other docs
//   Step 3: Generate / Edit Sections — "Generate with AI" button → section sidebar + viewer
//   Step 4: Final Report — view merged report + download
//
// State is saved to Postgres so user can resume where they left off.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { CompanySelector } from '@/components/generate/company-selector';
import { FileUploadZone } from '@/components/upload/file-upload-zone';
import { SectionSidebar } from '@/components/report/section-sidebar';
import type { SectionItem } from '@/components/report/section-sidebar';
import { PptViewer } from '@/components/report/ppt-viewer';
import { ProgressTracker } from '@/components/generate/progress-tracker';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { useUpload } from '@/lib/hooks/use-upload';
import type { UploadedFile } from '@/lib/hooks/use-upload';
import { useGenerate } from '@/lib/hooks/use-generate';
import { pcService } from '@/lib/api/pc-service';
import { POLL_INTERVAL_MS, UPLOAD_POLL_TIMEOUT_MS, MAX_CONSECUTIVE_POLL_ERRORS } from '@/lib/constants';
import {
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  UploadCloudIcon,
  Loader2Icon,
  CheckCircle2Icon,
  SparklesIcon,
  BuildingIcon,
  DownloadIcon,
  FileTextIcon,
  TableIcon,
  FileIcon,
  XIcon,
  AlertTriangleIcon,
  LayoutGridIcon,
} from 'lucide-react';

// ─── Step definitions ────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Company Onboarding', description: 'Create or select a company' },
  { id: 2, title: 'Upload Documents', description: 'Company presentations, financials & other docs' },
  { id: 3, title: 'Generate Sections', description: 'Generate report sections with AI' },
  { id: 4, title: 'Final Report', description: 'Review and download final report' },
] as const;

// Available sections from backend section_map.json
const AVAILABLE_SECTIONS = [
  { name: 'Company Overview', needsSubsidiary: true },
] as const;

function toId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Mini file list ──────────────────────────────────────────

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

// ─── Stepper indicator ───────────────────────────────────────

function StepperIndicator({ currentStep, steps }: { currentStep: number; steps: typeof STEPS }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                  ${isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isActive
                      ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'border-border/60 text-muted-foreground bg-background'
                  }
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <div className="text-center w-28">
                <p className={`text-xs font-medium leading-tight ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {step.title}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={`h-0.5 w-12 mx-2 mt-[-18px] transition-colors duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-border/60'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function ReportGenerationPage() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Company state
  const [company, setCompany] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Upload state
  const {
    presentations, financials, otherDocs, totalFiles,
    isUploading, uploadError, uploadSuccess,
    addPresentations, addFinancials, addOtherDocs, removeFile, uploadDocuments,
  } = useUpload();

  // Upload tracking — from DB (existing uploads for this company)
  const [uploadJob, setUploadJob] = useState<{
    status: string; progress: number; file_names: string[]; started_at: string;
  } | null>(null);
  const [isCheckingUpload, setIsCheckingUpload] = useState(false);

  // Backend upload processing state (polling /upload/status/{id})
  const [backendUploadJobId, setBackendUploadJobId] = useState<string | null>(null);
  const [backendUploadStatus, setBackendUploadStatus] = useState<string | null>(null);
  const [backendUploadProgress, setBackendUploadProgress] = useState(0);
  const [backendUploadError, setBackendUploadError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadPollStartedRef = useRef<number | null>(null);
  const uploadPollErrorsRef = useRef<number>(0);

  // Generate state
  const [selectedSection, setSelectedSection] = useState('');
  const [generatingSection, setGeneratingSection] = useState(''); // which section the hook is actively generating
  const [subsidiary, setSubsidiary] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sections, setSections] = useState<SectionItem[]>(
    AVAILABLE_SECTIONS.map((s) => ({ id: toId(s.name), name: s.name, status: 'idle' as const }))
  );
  const [activeIdx, setActiveIdx] = useState(-1); // -1 = no section selected

  // Subsidiary modal
  const [showSubsidiaryModal, setShowSubsidiaryModal] = useState(false);
  const [pendingSectionName, setPendingSectionName] = useState('');
  const [modalSubsidiary, setModalSubsidiary] = useState('');

  // Existing completed jobs from DB: sectionId → { backendJobId, viewerUrl, downloadUrl }
  const [sectionJobs, setSectionJobs] = useState<Record<string, {
    dbId: string;
    backendJobId: string;
    viewerUrl?: string;
    downloadUrl?: string;
  }>>({});
  const [isLoadingExistingJobs, setIsLoadingExistingJobs] = useState(false);

  const {
    jobId, status, progress, message, isGenerating, downloadUrl, viewerUrl: backendViewerUrl, error,
    startGeneration, resumePolling, reset: resetGeneration,
  } = useGenerate();

  // Build the viewer URL for the Office Online "Open in new tab" button.
  const viewerUrl = (() => {
    if (!backendViewerUrl) return undefined;
    if (backendViewerUrl.includes('view.officeapps.live.com')) return backendViewerUrl;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(backendViewerUrl)}`;
  })();

  const activeSection = sections[activeIdx] || null;

  // Whether this company already has documents uploaded
  const hasExistingUpload = uploadJob?.status === 'completed';

  // Whether the current upload (just triggered) has finished all backend processing
  const isBackendProcessing = !!backendUploadJobId && backendUploadStatus !== 'completed' && backendUploadStatus !== 'failed';
  const backendUploadCompleted = backendUploadStatus === 'completed';
  const backendUploadFailed = backendUploadStatus === 'failed';

  // ─── DB Integration ──────────────────────────────────────

  // Check upload status from DB when company changes.
  // If the latest job is still in-progress (pending/processing/indexing),
  // resume polling automatically — handles page refresh mid-upload.
  const checkUploadStatus = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsCheckingUpload(true);
      const res = await fetch(`/api/upload-jobs?company_id=${companyId}&latest=true`);
      const data = await res.json();
      if (data.job) {
        setUploadJob(data.job);

        // Resume polling if the job is still in-progress (e.g. after page refresh)
        const inProgressStatuses = ['pending', 'processing', 'indexing', 'uploading'];
        if (inProgressStatuses.includes(data.job.status) && !backendUploadJobId) {
          setBackendUploadJobId(data.job.id);
          setBackendUploadStatus(data.job.status);
          setBackendUploadProgress(data.job.progress ?? 0);
        }
      } else {
        setUploadJob(null);
      }
    } catch (err) {
      console.error('Failed to check upload status:', err);
    } finally {
      setIsCheckingUpload(false);
    }
  }, [companyId, backendUploadJobId]);

  // Reset polling state when switching companies — Company B shouldn't be
  // blocked by Company A's in-progress upload. checkUploadStatus will
  // re-establish polling if the new company also has an active job.
  useEffect(() => {
    setBackendUploadJobId(null);
    setBackendUploadStatus(null);
    setBackendUploadProgress(0);
    setBackendUploadError(null);
    setUploadJob(null);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      checkUploadStatus();
    }
  }, [companyId, checkUploadStatus]);

  // ─── Backend Upload Polling ──────────────────────────────

  // Poll the backend's /upload/status/{id} for pre-processing progress.
  // Safety limits: stops after UPLOAD_POLL_TIMEOUT_MS or MAX_CONSECUTIVE_POLL_ERRORS.
  useEffect(() => {
    if (!backendUploadJobId || backendUploadStatus === 'completed' || backendUploadStatus === 'failed') {
      // Stop polling when done or failed
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      uploadPollStartedRef.current = null;
      uploadPollErrorsRef.current = 0;
      return;
    }

    // Track when polling started
    if (!uploadPollStartedRef.current) {
      uploadPollStartedRef.current = Date.now();
    }
    uploadPollErrorsRef.current = 0;

    const poll = async () => {
      // ── Safety: absolute timeout ────────────────────────────
      const elapsed = Date.now() - (uploadPollStartedRef.current ?? Date.now());
      if (elapsed > UPLOAD_POLL_TIMEOUT_MS) {
        console.warn(`[upload poll] Timed out after ${Math.round(elapsed / 60_000)}min`);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setBackendUploadStatus('failed');
        setBackendUploadError('Upload processing timed out — the backend may be down. Please try again later.');
        return;
      }

      try {
        const res = await pcService.pollUploadStatus(backendUploadJobId);
        const data = res.data;
        uploadPollErrorsRef.current = 0; // reset on success
        setBackendUploadStatus(data.status);
        setBackendUploadProgress(data.progress);
        if (data.error) setBackendUploadError(data.error);

        if (data.status === 'completed' || data.status === 'failed') {
          if (data.status === 'completed') {
            await checkUploadStatus();
          }
        }
      } catch (err) {
        uploadPollErrorsRef.current += 1;
        console.error(`[upload poll] error (${uploadPollErrorsRef.current}/${MAX_CONSECUTIVE_POLL_ERRORS}):`, err);

        // ── Safety: stop after too many consecutive failures ──
        if (uploadPollErrorsRef.current >= MAX_CONSECUTIVE_POLL_ERRORS) {
          console.warn('[upload poll] Too many consecutive errors — stopping');
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setBackendUploadStatus('failed');
          setBackendUploadError('Lost connection to the server. Please check if the backend is running and try again.');
        }
      }
    };

    // Poll immediately, then on interval
    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [backendUploadJobId, backendUploadStatus, checkUploadStatus]);

  // Create upload job record in DB and start backend upload + polling
  const handleUpload = async () => {
    if (!company || presentations.length === 0) return;

    // Reset any previous polling state
    setBackendUploadJobId(null);
    setBackendUploadStatus(null);
    setBackendUploadProgress(0);
    setBackendUploadError(null);

    try {
      // Ensure company exists in DB
      let cId = companyId;
      if (!cId) {
        const res = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: company, module: 'pc', created_by: user?.id }),
        });
        const data = await res.json();
        cId = data.company.id;
        setCompanyId(cId);
      }

      // Create upload job in local DB for tracking
      const allFiles = [
        ...presentations.map(f => f.name),
        ...financials.map(f => f.name),
        ...otherDocs.map(f => f.name),
      ];
      const categories = {
        presentations: presentations.map(f => f.name),
        financials: financials.map(f => f.name),
        other: otherDocs.map(f => f.name),
      };

      await fetch('/api/upload-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: cId,
          file_names: allFiles,
          file_categories: categories,
          uploaded_by: user?.id,
        }),
      });

      // Send files to backend (Cloud Run) — backend returns upload_job_id
      const backendResponse = await uploadDocuments(company);
      const backendJobId = backendResponse?.data?.upload_job_id;

      if (backendJobId) {
        // Start polling the backend for pre-processing progress
        setBackendUploadJobId(backendJobId);
        setBackendUploadStatus('processing');
        setBackendUploadProgress(5);
      } else {
        // Fallback: if no upload_job_id returned, treat as immediately complete
        setBackendUploadStatus('completed');
        setBackendUploadProgress(100);
        await checkUploadStatus();
      }
    } catch {
      // Error is set in the hook
      setBackendUploadStatus('failed');
      setBackendUploadError('Upload failed. Please try again.');
    }
  };

  // ─── Fetch existing generation jobs from DB ────────────────
  const fetchExistingJobs = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingExistingJobs(true);
    try {
      console.log('[fetchExistingJobs] Fetching jobs for companyId:', companyId);
      const res = await fetch(`/api/generation-jobs?company_id=${companyId}`);
      const data = await res.json();
      console.log('[fetchExistingJobs] Response:', data);

      if (data.jobs && Array.isArray(data.jobs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allJobs = data.jobs as any[];
        console.log('[fetchExistingJobs] Total jobs:', allJobs.length);

        // Get the latest completed job per section (jobs are sorted by started_at DESC)
        const latestCompleted: Record<string, any> = {};
        for (const job of allJobs) {
          if (job.status === 'completed' && job.section_name) {
            const sectionId = toId(job.section_name);
            if (!latestCompleted[sectionId]) {
              latestCompleted[sectionId] = job;
              console.log(`[fetchExistingJobs] Found completed job for "${job.section_name}" (sectionId: ${sectionId}):`, job.id, 'backend_job_id:', job.backend_job_id);
            }
          }
        }

        // Update sidebar section statuses
        setSections((prev) =>
          prev.map((section) => {
            const job = latestCompleted[section.id];
            if (job) {
              console.log(`[fetchExistingJobs] Marking section "${section.name}" (id: ${section.id}) as completed`);
              return { ...section, status: 'completed' as const, jobId: job.id };
            }
            return section;
          })
        );

        // Store job data and poll backend for fresh viewer URLs
        const jobs: Record<string, { dbId: string; backendJobId: string; viewerUrl?: string; downloadUrl?: string }> = {};
        for (const [sectionId, job] of Object.entries(latestCompleted)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const j = job as any;
          jobs[sectionId] = {
            dbId: j.id,
            backendJobId: j.backend_job_id,
            downloadUrl: j.backend_job_id ? pcService.getDownloadUrl(j.backend_job_id) : undefined,
          };
          // Poll status to get fresh viewer URL (signed URLs expire after 24h)
          if (j.backend_job_id) {
            try {
              console.log(`[fetchExistingJobs] Polling status for backend_job_id: ${j.backend_job_id}`);
              const statusRes = await pcService.pollStatus(j.backend_job_id);
              console.log(`[fetchExistingJobs] Status response:`, statusRes.data);
              if (statusRes.data.viewer_url) {
                jobs[sectionId].viewerUrl = statusRes.data.viewer_url;
              }
              if (statusRes.data.pptx_path) {
                jobs[sectionId].downloadUrl = pcService.getDownloadUrl(j.backend_job_id);
              }
            } catch (err) {
              console.warn(`[fetchExistingJobs] Could not fetch fresh viewer URL for ${sectionId}:`, err);
            }
          }
        }
        console.log('[fetchExistingJobs] Final sectionJobs:', jobs);
        setSectionJobs(jobs);
      }
    } catch (err) {
      console.error('[fetchExistingJobs] Failed to fetch existing generation jobs:', err);
    } finally {
      setIsLoadingExistingJobs(false);
    }
  }, [companyId]);

  // Fetch existing jobs when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchExistingJobs();
    }
  }, [companyId, fetchExistingJobs]);

  // ─── Section Click Handler ───────────────────────────────
  const handleSectionClick = (sectionId: string) => {
    console.log('[handleSectionClick] sectionId:', sectionId);
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) { console.log('[handleSectionClick] section not found'); return; }
    setActiveIdx(idx);
    const section = sections[idx];
    console.log('[handleSectionClick] section:', section.name, 'status:', section.status);

    // If completed or generating, just view it
    if (section.status === 'completed' || section.status === 'generating') {
      console.log('[handleSectionClick] Section already', section.status, '— just viewing');
      return;
    }

    // Idle section — check if subsidiary is needed
    const config = AVAILABLE_SECTIONS.find((s) => toId(s.name) === sectionId);
    console.log('[handleSectionClick] config:', config, 'subsidiary:', JSON.stringify(subsidiary));
    setSelectedSection(section.name);

    if (config?.needsSubsidiary && !subsidiary.trim()) {
      console.log('[handleSectionClick] Opening subsidiary modal for:', section.name);
      setPendingSectionName(section.name);
      setModalSubsidiary('');
      setShowSubsidiaryModal(true);
    } else {
      console.log('[handleSectionClick] Starting generation directly for:', section.name);
      startGenerationForSection(section.name, subsidiary);
    }
  };

  const startGenerationForSection = (sectionName: string, sub: string = '') => {
    console.log('[startGenerationForSection] sectionName:', sectionName, 'subsidiary:', sub, 'company:', company);
    const id = toId(sectionName);
    setSelectedSection(sectionName);
    setGeneratingSection(sectionName);
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'generating' as const } : s))
    );
    const idx = sections.findIndex((s) => s.id === id);
    if (idx >= 0) setActiveIdx(idx);
    startGeneration(company, sub, sectionName);
  };

  const handleSubsidiarySubmit = () => {
    console.log('[handleSubsidiarySubmit] modalSubsidiary:', modalSubsidiary, 'pendingSectionName:', pendingSectionName);
    if (!modalSubsidiary.trim() || !pendingSectionName) return;
    setSubsidiary(modalSubsidiary.trim());
    setShowSubsidiaryModal(false);
    startGenerationForSection(pendingSectionName, modalSubsidiary.trim());
    setPendingSectionName('');
  };

  const handleRegenerate = () => {
    if (!activeSection) return;
    console.log('[handleRegenerate] Regenerating section:', activeSection.name);
    // Reset the section status to idle so the flow (modal → generate) works
    const sectionId = activeSection.id;
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, status: 'idle' as const } : s))
    );
    // Reset the useGenerate hook state
    resetGeneration();
    // Now trigger the click flow — this will open modal if subsidiary is needed
    const config = AVAILABLE_SECTIONS.find((s) => s.name === activeSection.name);
    setSelectedSection(activeSection.name);
    if (config?.needsSubsidiary && !subsidiary.trim()) {
      setPendingSectionName(activeSection.name);
      setModalSubsidiary('');
      setShowSubsidiaryModal(true);
    } else {
      startGenerationForSection(activeSection.name, subsidiary);
    }
  };

  // Update sidebar + sectionJobs on generation completion
  useEffect(() => {
    if (status === 'completed' && jobId && generatingSection) {
      const sectionId = toId(generatingSection);
      setSections((prev) =>
        prev.map((s) =>
          s.name === generatingSection ? { ...s, status: 'completed', jobId } : s
        ),
      );
      // Store fresh viewer/download URLs
      setSectionJobs((prev) => ({
        ...prev,
        [sectionId]: {
          dbId: prev[sectionId]?.dbId || '',
          backendJobId: jobId,
          viewerUrl: backendViewerUrl || undefined,
          downloadUrl: pcService.getDownloadUrl(jobId),
        },
      }));
    } else if (status === 'failed' && generatingSection) {
      setSections((prev) =>
        prev.map((s) =>
          s.name === generatingSection ? { ...s, status: 'idle' } : s
        ),
      );
    }
  }, [status, jobId, generatingSection, backendViewerUrl]);

  // ─── Navigation ──────────────────────────────────────────

  const canGoNext = () => {
    switch (currentStep) {
      case 1: return !!company;
      case 2: {
        // Block while we're still loading upload status from DB
        if (isCheckingUpload) return false;
        // Block while backend polling says processing is in-progress
        if (isBackendProcessing) return false;
        // Block if the DB record itself shows an in-progress status
        // (covers the window between DB load and polling resumption)
        const inProgressStatuses = ['pending', 'processing', 'indexing', 'uploading'];
        if (uploadJob && inProgressStatuses.includes(uploadJob.status)) return false;
        // Allow next only if we have a completed upload
        return hasExistingUpload || backendUploadCompleted;
      }
      case 3: return sections.some(s => s.status === 'completed');
      default: return false;
    }
  };

  const goNext = () => {
    if (currentStep < 4 && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Report Generation"
        description="Follow the steps below to onboard a company and generate report sections."
      />

      {/* Stepper */}
      <StepperIndicator currentStep={currentStep} steps={STEPS} />

      {/* ═══════════════ Step 1: Company Onboarding ═══════════════ */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Company selector */}
          <Card className="border-border/50 overflow-visible">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BuildingIcon className="h-5 w-5 text-primary" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-visible">
              <CompanySelector
                value={company}
                onChange={(name, id) => {
                  setCompany(name);
                  if (id) setCompanyId(id);
                }}
                disabled={isUploading}
                module="pc"
              />
            </CardContent>
          </Card>



          {/* Upload status from DB */}
          {uploadJob && (
            <Card className={`border-border/50 ${uploadJob.status === 'processing' ? 'border-amber-500/30' : uploadJob.status === 'completed' ? 'border-emerald-500/30' : ''}`}>
              <CardContent className="p-4">
                {uploadJob.status === 'processing' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2Icon className="h-4 w-4 animate-spin text-amber-500" />
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Upload in progress</p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Files: {(uploadJob.file_names || []).join(', ')}</p>
                      <p>Started: {new Date(uploadJob.started_at).toLocaleString()}</p>
                      <p>Progress: {uploadJob.progress}%</p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${uploadJob.progress}%` }} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                      <AlertTriangleIcon className="h-3.5 w-3.5" />
                      You can re-upload new documents once the current process is done
                    </div>
                  </div>
                ) : uploadJob.status === 'completed' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Previous upload completed</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>Files: {(uploadJob.file_names || []).join(', ')}</p>
                      <p>Uploaded: {new Date(uploadJob.started_at).toLocaleString()}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════ Step 2: Upload Documents (optional if docs exist) ═══════════════ */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Existing upload banner — skip option */}
          {hasExistingUpload && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2Icon className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Documents already uploaded for {company}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Files: {(uploadJob?.file_names || []).join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {uploadJob?.started_at ? new Date(uploadJob.started_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(3)}
                    className="gap-1.5 shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    Skip to Generate
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 ml-8">
                  You can upload new documents below to replace the existing ones, or skip this step.
                </p>
              </CardContent>
            </Card>
          )}
          {/* Company Presentations */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-red-500" />
                Company Presentations
                <span className="text-xs text-muted-foreground font-normal">(PDF files — required)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                onFilesSelected={addPresentations}
                disabled={isUploading || isBackendProcessing}
                label="Drop PDF files here"
                description="Annual reports, investor decks, presentations"
                accept=".pdf"
                id="upload-presentations"
              />
              <MiniFileList files={presentations} onRemove={removeFile} disabled={isUploading || isBackendProcessing} />
            </CardContent>
          </Card>

          {/* Financial Models */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-green-500" />
                Financial Models
                <span className="text-xs text-muted-foreground font-normal">(Excel files — required)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                onFilesSelected={addFinancials}
                disabled={isUploading || isBackendProcessing}
                label="Drop Excel files here"
                description="Financial models, spreadsheets (.xlsx, .xls, .csv)"
                accept=".xlsx,.xls,.csv"
                id="upload-financials"
              />
              <MiniFileList files={financials} onRemove={removeFile} disabled={isUploading || isBackendProcessing} />
            </CardContent>
          </Card>

          {/* Other Documents */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-blue-500" />
                Other Documents
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadZone
                onFilesSelected={addOtherDocs}
                disabled={isUploading || isBackendProcessing}
                label="Drop any other supporting docs here"
                description="Word documents, additional reference files (.docx, .pdf, etc.)"
                accept=".pdf,.docx,.doc,.txt"
                id="upload-other"
              />
              <MiniFileList files={otherDocs} onRemove={removeFile} disabled={isUploading || isBackendProcessing} />
            </CardContent>
          </Card>

          {/* Upload all files button + progress bar */}
          {totalFiles > 0 && (
            <Card className={`border-border/50 ${
              isBackendProcessing ? 'border-amber-500/30' : backendUploadCompleted ? 'border-emerald-500/30' : backendUploadFailed ? 'border-destructive/30' : ''
            }`}>
              <CardContent className="p-4 space-y-3">
                {/* Upload button — hidden once processing starts */}
                {!isBackendProcessing && !backendUploadCompleted && !backendUploadFailed && (
                  <Button
                    id="pc-upload-docs"
                    onClick={handleUpload}
                    disabled={!company || presentations.length === 0 || isUploading}
                    className="w-full h-11 text-base font-medium gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2Icon className="h-5 w-5 animate-spin" />
                        Uploading files...
                      </>
                    ) : (
                      <>
                        <UploadCloudIcon className="h-5 w-5" />
                        Upload {totalFiles} Document{totalFiles !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                )}

                {/* Backend pre-processing progress bar */}
                {isBackendProcessing && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <Loader2Icon className="h-4 w-4 animate-spin text-amber-500" />
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {backendUploadStatus === 'indexing'
                          ? 'Indexing documents for AI search...'
                          : 'Pre-processing uploaded documents...'}
                      </p>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${backendUploadProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {backendUploadProgress < 30 && 'Extracting data from files...'}
                        {backendUploadProgress >= 30 && backendUploadProgress < 60 && 'Parsing slides & financials...'}
                        {backendUploadProgress >= 60 && backendUploadProgress < 85 && 'Uploading to AI search engine...'}
                        {backendUploadProgress >= 85 && 'Verifying search readiness...'}
                      </span>
                      <span className="font-medium">{backendUploadProgress}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                      <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                      Please wait — this step ensures the AI can search your documents during report generation.
                    </div>
                  </div>
                )}

                {/* Backend processing complete */}
                {backendUploadCompleted && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-5 w-5 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        All documents uploaded and indexed successfully!
                      </p>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-full" />
                    </div>
                    <p className="text-xs text-muted-foreground">Click &quot;Next&quot; to proceed to report generation.</p>
                  </div>
                )}

                {/* Backend processing failed */}
                {backendUploadFailed && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon className="h-5 w-5 text-destructive" />
                      <p className="text-sm font-medium text-destructive">
                        Pre-processing failed
                      </p>
                    </div>
                    {backendUploadError && (
                      <p className="text-xs text-destructive/80">{backendUploadError}</p>
                    )}
                    <Button
                      onClick={() => {
                        setBackendUploadJobId(null);
                        setBackendUploadStatus(null);
                        setBackendUploadProgress(0);
                        setBackendUploadError(null);
                      }}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <UploadCloudIcon className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Upload-level errors (file transfer errors) */}
                {uploadError && !backendUploadFailed && (
                  <p className="text-sm text-destructive text-center">{uploadError}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════ Step 3: Generate Sections ═══════════════ */}
      {currentStep === 3 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Always show sidebar + content layout */}
          <div className="flex min-h-[28rem] gap-0 rounded-xl border border-border/50">
            {/* Left — Section Sidebar */}
            <div className="w-64 border-r border-border/50 bg-muted/20 flex-shrink-0 flex flex-col">
              <SectionSidebar
                sections={sections}
                activeSection={activeSection?.id || ''}
                onSectionClick={handleSectionClick}
              />
            </div>

            {/* Right — Content */}
            <div className="flex-1 flex flex-col">
              {(() => {
                // Determine what to show based on active section state
                // Show ProgressTracker if either:
                //   a) the useGenerate hook reports isGenerating for this section, OR
                //   b) the section status is 'generating' (covers the gap before the hook resolves)
                const isCurrentlyGenerating =
                  (activeSection?.name === generatingSection && isGenerating) ||
                  (activeSection?.status === 'generating');
                const justCompleted = activeSection?.name === generatingSection && status === 'completed' && !isGenerating;
                const justFailed = activeSection?.name === generatingSection && status === 'failed' && !isGenerating;
                const existingJob = activeSection ? sectionJobs[activeSection.id] : null;
                const isExistingCompleted = activeSection?.status === 'completed' && !isCurrentlyGenerating;

                // Determine viewer/download URLs for the active section
                const activeViewerUrl = justCompleted ? viewerUrl : existingJob?.viewerUrl
                  ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(existingJob.viewerUrl)}`
                  : undefined;
                const activeRawFileUrl = justCompleted ? backendViewerUrl : existingJob?.viewerUrl;
                const activeDownloadUrl = justCompleted ? downloadUrl : existingJob?.downloadUrl;

                // ── No section selected ──
                if (!activeSection || activeIdx < 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                        <LayoutGridIcon className="h-10 w-10 text-primary/60" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Select a Section</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Click on a section from the sidebar to start generating your report.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Section header */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-border/50">
                      <div>
                        <h2 className="text-lg font-semibold">{activeSection.name}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isCurrentlyGenerating && message}
                          {justCompleted && '✓ Generated — review below or refine with AI'}
                          {justFailed && '✗ Generation failed'}
                          {isExistingCompleted && !justCompleted && '✓ Previously generated'}
                          {activeSection.status === 'idle' && !isCurrentlyGenerating && 'Generation will start shortly...'}
                        </p>
                      </div>
                      {activeDownloadUrl && (isExistingCompleted || justCompleted) && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={activeDownloadUrl} download className="gap-2">
                              <DownloadIcon className="h-4 w-4" />
                              Download PPTX
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 p-4">
                      {isCurrentlyGenerating ? (
                        // Currently generating — show progress
                        <div className="max-w-xl mx-auto mt-8">
                          <ProgressTracker
                            status={status}
                            progress={progress}
                            message={message}
                            isGenerating={isGenerating}
                            jobId={jobId}
                          />
                        </div>
                      ) : (isExistingCompleted || justCompleted) && activeViewerUrl ? (
                        // Completed with viewer URL — show PPT viewer
                        <PptViewer
                          viewerUrl={activeViewerUrl}
                          pptxUrl={activeDownloadUrl || undefined}
                          rawFileUrl={activeRawFileUrl || undefined}
                        />
                      ) : (isExistingCompleted || justCompleted) && !activeViewerUrl ? (
                        // Completed but no viewer URL (expired or unavailable)
                        <div className="flex h-full items-center justify-center">
                          <div className="flex flex-col items-center gap-4 p-8 max-w-md">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                              <CheckCircle2Icon className="h-8 w-8 text-emerald-500" />
                            </div>
                            <div className="text-center space-y-2">
                              <p className="text-sm font-medium">Report Previously Generated</p>
                              <p className="text-xs text-muted-foreground">
                                This section was generated before. The preview link has expired but you can download the file or regenerate it.
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {activeDownloadUrl && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={activeDownloadUrl} download className="gap-2">
                                    <DownloadIcon className="h-4 w-4" />
                                    Download PPTX
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" onClick={handleRegenerate} className="gap-2">
                                <SparklesIcon className="h-4 w-4" />
                                Regenerate
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : justFailed ? (
                        // Generation failed
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center space-y-3">
                            <p className="text-sm text-destructive font-medium">Generation failed</p>
                            <p className="text-xs text-muted-foreground">{error}</p>
                            <Button size="sm" onClick={handleRegenerate}>
                              <SparklesIcon className="h-4 w-4 mr-2" />
                              Retry
                            </Button>
                          </div>
                        </div>
                      ) : isLoadingExistingJobs ? (
                        // Loading existing jobs
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center space-y-3">
                            <Loader2Icon className="h-8 w-8 animate-spin text-primary/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">Checking for existing reports...</p>
                          </div>
                        </div>
                      ) : (
                        // Idle section selected — waiting for user action (e.g. subsidiary modal)
                        <div className="flex h-full items-center justify-center">
                          <div className="flex flex-col items-center gap-4 p-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                              <SparklesIcon className="h-8 w-8 text-primary/60" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">Ready to Generate</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {showSubsidiaryModal
                                  ? 'Please fill in the subsidiary name in the popup to start generation.'
                                  : 'Generation will begin shortly...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Regenerate prompt — for completed sections */}
                    {(isExistingCompleted || justCompleted) && (
                      <div className="border-t border-border/50 px-6 py-4">
                        <Card className="border-border/40 bg-muted/10">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <SparklesIcon className="h-4 w-4 text-primary" />
                              <p className="text-sm font-medium">Refine with AI</p>
                            </div>
                            <Textarea
                              placeholder='e.g. "Add more financial metrics", "Make it more concise"...'
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              rows={2}
                              className="resize-none text-sm"
                            />
                            <Button onClick={handleRegenerate} disabled={isGenerating} className="gap-2" size="sm">
                              <SparklesIcon className="h-4 w-4" />
                              Regenerate
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Subsidiary Modal */}
          <Dialog open={showSubsidiaryModal} onOpenChange={setShowSubsidiaryModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BuildingIcon className="h-5 w-5 text-primary" />
                  Subsidiary Name Required
                </DialogTitle>
                <DialogDescription>
                  The <span className="font-medium">{pendingSectionName}</span> section requires a subsidiary or segment name to generate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Label htmlFor="modal-subsidiary" className="text-sm font-medium">
                  Subsidiary / Segment Name
                </Label>
                <Input
                  id="modal-subsidiary"
                  placeholder="Enter subsidiary or segment name..."
                  value={modalSubsidiary}
                  onChange={(e) => setModalSubsidiary(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubsidiarySubmit(); }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSubsidiaryModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubsidiarySubmit} disabled={!modalSubsidiary.trim()} className="gap-2">
                  <SparklesIcon className="h-4 w-4" />
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ═══════════════ Step 4: Final Report ═══════════════ */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-primary" />
                Final Report — {company}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Generated sections summary */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Generated Sections:</p>
                {sections.filter(s => s.status === 'completed').length > 0 ? (
                  <div className="space-y-1">
                    {sections.filter(s => s.status === 'completed').map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                        {s.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No sections generated yet. Go back to Step 3.</p>
                )}
              </div>

              {/* Viewer — show the latest completed section */}
              {viewerUrl ? (
                <div className="mt-4">
                  <PptViewer viewerUrl={viewerUrl} pptxUrl={downloadUrl || undefined} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/60 bg-muted/10">
                  <FileTextIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Final report preview will appear here</p>
                </div>
              )}

              {/* Download button */}
              {downloadUrl && (
                <Button className="w-full h-12 text-base font-medium gap-2" size="lg" asChild>
                  <a href={downloadUrl} download>
                    <DownloadIcon className="h-5 w-5" />
                    Download Final Report
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ Navigation Buttons ═══════════════ */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Step {currentStep} of {STEPS.length}
        </div>

        {currentStep < 4 ? (
          <Button
            onClick={goNext}
            disabled={!canGoNext()}
            className="gap-2"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        ) : (
          <div /> // Empty placeholder for spacing
        )}
      </div>
    </div>
  );
}
