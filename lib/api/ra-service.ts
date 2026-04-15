// lib/api/ra-service.ts
//  "POST /generate (202 + job_id), GET /status/:job_id, POST /upload, POST /chat"

export interface GenerateParams {
  companyName: string;
  subsidiary?: string;
  section: string;
  prompt?: string;
  documentIds: string[];
  rankings: number[];
}

export const raService = {

  //  "POST /upload"
  async uploadDocuments(companyName: string, files: File[], rankings: number[]) {
    // TODO: POST ${RA_API_BASE}/upload (multipart/form-data)
  },

  //  "POST /generate (202 + job_id)"
  async generateReport(params: GenerateParams) {
    // TODO: POST ${RA_API_BASE}/generate → 202 + job_id
  },

  //  "GET /status/:job_id"
  async pollStatus(jobId: string) {
    // TODO: GET ${RA_API_BASE}/status/${jobId}
  },

  //  "POST /chat"
  async sendChatMessage(jobId: string, message: string) {
    // TODO: POST ${RA_API_BASE}/chat
  },
};
