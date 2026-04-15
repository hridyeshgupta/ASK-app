// lib/api/pc-service.ts
// Same structure as ra-service — routes to PC backend URL

export interface GenerateParams {
  companyName: string;
  subsidiary?: string;
  section: string;
  prompt?: string;
  documentIds: string[];
  rankings: number[];
}

export const pcService = {

  //  "POST /upload"
  async uploadDocuments(companyName: string, files: File[], rankings: number[]) {
    // TODO: POST ${PC_API_BASE}/upload (multipart/form-data)
  },

  //  "POST /generate (202 + job_id)"
  async generateReport(params: GenerateParams) {
    // TODO: POST ${PC_API_BASE}/generate → 202 + job_id
  },

  //  "GET /status/:job_id"
  async pollStatus(jobId: string) {
    // TODO: GET ${PC_API_BASE}/status/${jobId}
  },

  //  "POST /chat"
  async sendChatMessage(jobId: string, message: string) {
    // TODO: POST ${PC_API_BASE}/chat
  },
};
