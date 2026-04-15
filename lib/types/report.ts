// lib/types/report.ts
//  "API immediately returns 'in progress,' frontend polls the DB endpoint,
//       backend updates progress % at checkpoints"
export type JobStatus = 'pending' | 'extracting' | 'planning'
  | 'building_slides' | 'uploading' | 'completed' | 'failed';

export interface Report {
  jobId: string;
  companyName: string;
  subsidiary?: string;
  section: string;
  status: JobStatus;
  progress: number;
  message: string;
  viewerUrl?: string;      // "signed GCS URL"
  pptxUrl?: string;
  createdAt: string;
  createdBy: string;
  versions: Version[];
}

//  "Every output version is retained in GCS; URL recorded in Postgres"
export interface Version {
  versionNumber: number;
  createdAt: string;
  changeDescription: string;
  viewerUrl: string;
  pptxUrl: string;
}

//  "chat/edit loop"
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  version?: number;
}
