// lib/types/api.ts
//  "POST /generate (202 + job_id), GET /status/:job_id, POST /upload, POST /chat"
export interface ApiEnvelope<T = unknown> {
  status: string;
  message: string;
  data: T;
}
