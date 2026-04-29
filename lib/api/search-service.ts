// lib/api/search-service.ts
// API integration for Custom Search (Internal + External).
// Backend endpoints (from OpenAPI spec):
//   GET /internal-search?query=...&company=...
//   GET /external-search?query=...
// Both are proxied through /api/proxy/* to avoid CORS.
// Internal search queries Vertex AI data stores (PDFs/images/Excel),
// Gemini 2.5 Pro summarises the results.
// External search uses Google Search (currently 403 — GCP permission issue).

export interface SearchResult {
  query: string;
  summary: string;
  totalResults: number;
  errors: string[];
  sources?: string[];
}

// Backend response envelope: { status, message, data: { ... } }
interface BackendSearchData {
  success: boolean;
  source: string;
  query: string;
  company_filter: string;
  total_results: number;
  errors: string[];
  summaries: string[];
  results: unknown[];
  rendered_markdown: string;
}

interface BackendEnvelope {
  status: string;
  message: string;
  data: BackendSearchData;
}

interface SearchErrorResponse {
  detail?: string | { msg: string }[];
  error?: string;
  message?: string;
}

function extractErrorMessage(err: SearchErrorResponse, fallback: string): string {
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail) && err.detail.length > 0) return err.detail[0].msg;
  return err.error || err.message || fallback;
}

function parseSearchResponse(raw: BackendEnvelope, query: string): SearchResult {
  const d = raw.data;

  // Use rendered_markdown as primary summary (backend formats it nicely)
  let summary = d.rendered_markdown || '';

  // If there are errors but the request didn't fail (status: "ok"),
  // append errors as warnings so the user sees them
  if (d.errors && d.errors.length > 0 && d.total_results === 0) {
    const errorText = d.errors.join('\n');
    summary = summary
      ? `${summary}\n\n⚠️ **Warnings:**\n${errorText}`
      : `⚠️ No results found.\n\n${errorText}`;
  }

  // If we have summaries from Gemini, prefer those over rendered_markdown
  if (d.summaries && d.summaries.length > 0) {
    summary = d.summaries.join('\n\n');
  }

  return {
    query,
    summary: summary || 'No results found.',
    totalResults: d.total_results || 0,
    errors: d.errors || [],
  };
}

export const searchService = {
  /**
   * GET /internal-search?query=...&company=...
   * Queries internal Vertex AI data stores.
   * Gemini 2.5 Pro summarises fetched data (PDFs, images, Excel).
   */
  async internalSearch(query: string, company: string = ''): Promise<SearchResult> {
    const params = new URLSearchParams({ query });
    if (company) params.set('company', company);

    const response = await fetch(`/api/proxy/internal-search?${params.toString()}`);

    if (response.status === 500) {
      throw new Error('Internal search encountered a server error. The Vertex AI data store may not be configured or no documents have been indexed yet.');
    }

    if (!response.ok) {
      const err: SearchErrorResponse = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(
        extractErrorMessage(err, `Internal search failed: ${response.status}`),
      );
    }

    const raw: BackendEnvelope = await response.json();
    return parseSearchResponse(raw, query);
  },

  /**
   * GET /external-search?query=...
   * Google Search via GCP.
   * Currently returns 403 due to GCP permissions — handled gracefully in UI.
   */
  async externalSearch(query: string): Promise<SearchResult> {
    const params = new URLSearchParams({ query });

    const response = await fetch(`/api/proxy/external-search?${params.toString()}`);

    if (response.status === 403 || response.status === 400) {
      throw new Error('Permission denied for external search.');
    }

    if (response.status === 500) {
      throw new Error('External search encountered a server error. The Google Search API may not be configured yet.');
    }

    if (!response.ok) {
      const err: SearchErrorResponse = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(
        extractErrorMessage(err, `External search failed: ${response.status}`),
      );
    }

    const raw: BackendEnvelope = await response.json();
    return parseSearchResponse(raw, query);
  },
};
