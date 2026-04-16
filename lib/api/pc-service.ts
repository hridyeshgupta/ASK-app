// lib/api/pc-service.ts
// Real API integration with the PPT Agent backend on Cloud Run.
// Endpoints: /upload, /generate, /status/:job_id, /download/:job_id, /manifest/:company, /merge/:company

import { PC_API_BASE } from '@/lib/constants';

// --- Response types matching backend's envelope format ---

interface ApiEnvelope<T = unknown> {
  status: string;
  message: string;
  data: T;
}

export interface UploadResponse {
  company_name: string;
  files: string[];
}

export interface GenerateResponse {
  job_id: string;
  status: string;
  progress: number;
}

export interface StatusResponse {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  pptx_path: string | null;
  viewer_url: string | null;
  error: string | null;
}

export interface ManifestRun {
  job_id: string;
  section: string;
  deck_path: string | null;
  timestamp?: string;
}

export interface ManifestResponse {
  company_name: string;
  runs: ManifestRun[];
}

export interface MergeResponse {
  company_name: string;
  merged_deck: string;
  sections: string[];
}

// --- Service ---

export const pcService = {

  // POST /upload — multipart/form-data with three file categories
  async uploadDocuments(
    companyName: string,
    investorPresentations: File[],
    financialModels: File[],
    otherDocs?: File[],
  ): Promise<ApiEnvelope<UploadResponse>> {
    const formData = new FormData();
    formData.append('company_name', companyName);

    for (const file of investorPresentations) {
      formData.append('investor_presentations', file);
    }
    for (const file of financialModels) {
      formData.append('financial_models', file);
    }
    if (otherDocs) {
      for (const file of otherDocs) {
        formData.append('other_docs', file);
      }
    }

    const response = await fetch(`${PC_API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      // Note: Do NOT set Content-Type header — browser sets it with boundary for multipart
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  // POST /generate — form data, returns job_id
  async generateReport(
    companyName: string,
    subsidiaryName: string = '',
    section: string = 'Company Overview',
  ): Promise<ApiEnvelope<GenerateResponse>> {
    const formData = new FormData();
    formData.append('company_name', companyName);
    formData.append('subsidiary_name', subsidiaryName);
    formData.append('section', section);

    const response = await fetch(`${PC_API_BASE}/generate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Generate failed: ${response.status}`);
    }

    return response.json();
  },

  // GET /status/:job_id — poll for progress
  async pollStatus(jobId: string): Promise<ApiEnvelope<StatusResponse>> {
    const response = await fetch(`${PC_API_BASE}/status/${jobId}`);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Status check failed: ${response.status}`);
    }

    return response.json();
  },

  // GET /download/:job_id — returns the PPTX file URL
  getDownloadUrl(jobId: string): string {
    return `${PC_API_BASE}/download/${jobId}`;
  },

  // GET /manifest/:company_name — list all completed runs
  async getManifest(companyName: string): Promise<ApiEnvelope<ManifestResponse>> {
    const response = await fetch(`${PC_API_BASE}/manifest/${encodeURIComponent(companyName)}`);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Manifest fetch failed: ${response.status}`);
    }

    return response.json();
  },

  // POST /merge/:company_name — merge selected/all decks
  async mergeDecks(
    companyName: string,
    jobIds?: string[],
  ): Promise<ApiEnvelope<MergeResponse>> {
    const response = await fetch(`${PC_API_BASE}/merge/${encodeURIComponent(companyName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jobIds ? JSON.stringify(jobIds) : JSON.stringify(null),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Merge failed: ${response.status}`);
    }

    return response.json();
  },

  // GET /merge/download/:company_name — download merged deck
  getMergedDownloadUrl(companyName: string): string {
    return `${PC_API_BASE}/merge/download/${encodeURIComponent(companyName)}`;
  },
};
