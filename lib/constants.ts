// lib/constants.ts

export const APP_NAME = 'ASK Platform';

//  "The frontend holds the two Cloud Run HTTPS endpoints as environment variables"
export const RA_API_BASE = process.env.NEXT_PUBLIC_RA_API_URL || '';
export const PC_API_BASE = process.env.NEXT_PUBLIC_PC_API_URL || '';

// Firebase config
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

//  "frontend polls GET /status/:job_id every ~3s"
export const POLL_INTERVAL_MS = 3000;

// Polling safety limits — stop polling after these limits to prevent
// infinite polling when Cloud Run is down or a job is stuck.
export const UPLOAD_POLL_TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes
export const GENERATE_POLL_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes
export const MAX_CONSECUTIVE_POLL_ERRORS = 5;            // stop after 5 failed requests

// Report sections available for generation
export const REPORT_SECTIONS = [
  'Company Overview',
  'Subsidiary Deep Dive',
  'Executive Summary',
  'Market Overview',
  'Financial Analysis',
  'Risk Assessment',
  'Investment Thesis',
  'Appendix',
] as const;

// Supported file types for upload
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.xlsx', '.docx'] as const;
