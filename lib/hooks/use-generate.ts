'use client';

// lib/hooks/use-generate.ts
// Calls the real PPT Agent backend: POST /generate then polls GET /status/:job_id every ~3s

import { useState, useCallback, useRef } from 'react';
import type { JobStatus } from '@/lib/types/report';
import { POLL_INTERVAL_MS } from '@/lib/constants';
import { pcService } from '@/lib/api/pc-service';

interface GenerateState {
  jobId: string | null;
  status: JobStatus;
  progress: number;
  message: string;
  isGenerating: boolean;
  downloadUrl: string | null;
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
    error: null,
  });

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const response = await pcService.pollStatus(jobId);
        const data = response.data;

        setState((prev) => ({
          ...prev,
          status: data.status as JobStatus,
          progress: data.progress,
          message: data.message,
          downloadUrl: data.pptx_path ? pcService.getDownloadUrl(jobId) : prev.downloadUrl,
        }));

        // Stop polling on terminal states
        if (data.status === 'completed' || data.status === 'failed') {
          stopPolling();
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error: data.status === 'failed' ? (data.error || 'Generation failed') : null,
            downloadUrl: data.status === 'completed' ? pcService.getDownloadUrl(jobId) : null,
          }));
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient errors — retry on next interval
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

  const reset = useCallback(() => {
    stopPolling();
    setState({
      jobId: null,
      status: 'pending',
      progress: 0,
      message: '',
      isGenerating: false,
      downloadUrl: null,
      error: null,
    });
  }, [stopPolling]);

  return { ...state, startGeneration, reset, stopPolling };
}
