'use client';

// lib/hooks/use-generate.ts
// Calls the real PPT Agent backend: POST /generate then polls GET /status/:job_id every ~3s
// Includes safety limits: stops polling after GENERATE_POLL_TIMEOUT_MS or MAX_CONSECUTIVE_POLL_ERRORS.

import { useState, useCallback, useRef } from 'react';
import type { JobStatus } from '@/lib/types/report';
import { POLL_INTERVAL_MS, GENERATE_POLL_TIMEOUT_MS, MAX_CONSECUTIVE_POLL_ERRORS } from '@/lib/constants';
import { pcService } from '@/lib/api/pc-service';

interface GenerateState {
  jobId: string | null;
  status: JobStatus;
  progress: number;
  message: string;
  isGenerating: boolean;
  downloadUrl: string | null;
  viewerUrl: string | null;
  error: string | null;
}

export function useGenerate() {
  const [state, setState] = useState<GenerateState>({
    jobId: null,
    status: 'pending',
    progress: 0,
    message: '',
    isGenerating: false,
    downloadUrl: null,
    viewerUrl: null,
    error: null,
  });

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollStartedAtRef.current = null;
    consecutiveErrorsRef.current = 0;
  }, []);

  const startPolling = useCallback((jobId: string) => {
    pollStartedAtRef.current = Date.now();
    consecutiveErrorsRef.current = 0;

    pollRef.current = setInterval(async () => {
      // ── Safety: absolute timeout ──────────────────────────────
      const elapsed = Date.now() - (pollStartedAtRef.current ?? Date.now());
      if (elapsed > GENERATE_POLL_TIMEOUT_MS) {
        console.warn(`[generate poll] Timed out after ${Math.round(elapsed / 60_000)}min — stopping polling`);
        stopPolling();
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          status: 'failed',
          error: 'Generation timed out — the backend may be down. Please try again later.',
          message: 'Polling timed out',
        }));
        return;
      }

      try {
        const response = await pcService.pollStatus(jobId);
        const data = response.data;

        // Reset error counter on successful response
        consecutiveErrorsRef.current = 0;

        setState((prev) => ({
          ...prev,
          status: data.status as JobStatus,
          progress: data.progress,
          message: data.message,
          downloadUrl: data.pptx_path ? pcService.getDownloadUrl(jobId) : prev.downloadUrl,
          viewerUrl: data.viewer_url || prev.viewerUrl,
        }));

        // Stop polling on terminal states
        if (data.status === 'completed' || data.status === 'failed') {
          stopPolling();
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error: data.status === 'failed' ? (data.error || 'Generation failed') : null,
            downloadUrl: data.status === 'completed' ? pcService.getDownloadUrl(jobId) : null,
            viewerUrl: data.status === 'completed' ? (data.viewer_url || prev.viewerUrl) : null,
          }));
        }
      } catch (err) {
        consecutiveErrorsRef.current += 1;
        console.error(`[generate poll] error (${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_POLL_ERRORS}):`, err);

        // ── Safety: stop after too many consecutive failures ────
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_POLL_ERRORS) {
          console.warn('[generate poll] Too many consecutive errors — stopping polling');
          stopPolling();
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            status: 'failed',
            error: 'Lost connection to the server. Please check if the backend is running and try again.',
            message: 'Polling stopped — server unreachable',
          }));
        }
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const startGeneration = useCallback(async (
    companyName: string,
    subsidiaryName: string = '',
    section: string = 'Company Overview',
  ) => {
    setState({
      jobId: null,
      status: 'pending',
      progress: 0,
      message: 'Starting generation...',
      isGenerating: true,
      downloadUrl: null,
      viewerUrl: null,
      error: null,
    });

    try {
      const response = await pcService.generateReport(companyName, subsidiaryName, section);
      const jobId = response.data.job_id;

      setState((prev) => ({
        ...prev,
        jobId,
        status: response.data.status as JobStatus,
        progress: response.data.progress,
        message: 'Generation started — polling for updates...',
      }));

      // Start polling for status updates
      startPolling(jobId);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        status: 'failed',
        progress: 0,
        message: err instanceof Error ? err.message : 'Failed to start generation',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [startPolling]);

  // Resume polling for an existing in-progress job (e.g. after page refresh).
  // Does NOT call /generate — just starts polling /status/{jobId}.
  const resumePolling = useCallback((existingJobId: string, currentProgress: number = 0) => {
    stopPolling(); // clear any prior interval
    setState({
      jobId: existingJobId,
      status: 'generating',
      progress: currentProgress,
      message: 'Resuming generation polling...',
      isGenerating: true,
      downloadUrl: null,
      viewerUrl: null,
      error: null,
    });
    startPolling(existingJobId);
  }, [stopPolling, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      jobId: null,
      status: 'pending',
      progress: 0,
      message: '',
      isGenerating: false,
      downloadUrl: null,
      viewerUrl: null,
      error: null,
    });
  }, [stopPolling]);

  return { ...state, startGeneration, resumePolling, reset, stopPolling };
}
