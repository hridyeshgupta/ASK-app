'use client';

// lib/hooks/use-generate.ts
// Will call pollStatus in a loop
import { useState, useCallback, useRef } from 'react';
import type { JobStatus } from '@/lib/types/report';
import { POLL_INTERVAL_MS } from '@/lib/constants';

interface GenerateState {
  jobId: string | null;
  status: JobStatus;
  progress: number;
  message: string;
  isGenerating: boolean;
}

export function useGenerate() {
  const [state, setState] = useState<GenerateState>({
    jobId: null,
    status: 'pending',
    progress: 0,
    message: '',
    isGenerating: false,
  });

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startGeneration = useCallback(async () => {
    setState({
      jobId: `job-${Date.now()}`,
      status: 'pending',
      progress: 0,
      message: 'Starting generation...',
      isGenerating: true,
    });

    // TODO: Call API service generateReport and start polling
    // Simulated progression for UI rendering
    const phases: { status: JobStatus; progress: number; message: string }[] = [
      { status: 'extracting', progress: 20, message: 'Extracting document data...' },
      { status: 'planning', progress: 40, message: 'Planning report structure...' },
      { status: 'building_slides', progress: 70, message: 'Building slides...' },
      { status: 'uploading', progress: 90, message: 'Uploading to cloud...' },
      { status: 'completed', progress: 100, message: 'Report ready!' },
    ];

    let phaseIndex = 0;
    pollRef.current = setInterval(() => {
      if (phaseIndex < phases.length) {
        setState((prev) => ({
          ...prev,
          ...phases[phaseIndex],
        }));
        phaseIndex++;
      } else {
        if (pollRef.current) clearInterval(pollRef.current);
        setState((prev) => ({ ...prev, isGenerating: false }));
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setState({
      jobId: null,
      status: 'pending',
      progress: 0,
      message: '',
      isGenerating: false,
    });
  }, []);

  return { ...state, startGeneration, reset };
}
