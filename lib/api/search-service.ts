// lib/api/search-service.ts
// API integration for Custom Search (Internal + External).
// Backend endpoints (from OpenAPI spec):
//   GET /internal-search?query=...&company=...
//   GET /external-search?query=...
// Both are proxied through /api/proxy/* to avoid CORS.
// Internal search queries Vertex AI data stores (PDFs/images/Excel),
// Gemini 2.5 Pro summarises the results.
// External search uses Google Search (currently 403 — GCP permission issue).

// ── Structured types for rich rendering ──────────────────────

/** A single reference cited in the AI summary */
export interface SearchReference {
  index: number;       // e.g. 1, 2, 3
  title: string;       // document / file name
  uri?: string;        // optional clickable link (GCS URL or web link)
}

/** A summary block (from the AI) with its own references */
export interface SummaryBlock {
  text: string;                  // the AI-generated summary markdown
  references: SearchReference[]; // numbered references within this summary
  label?: string;                // e.g. "AI Summary from Documents", "AI Summary from Financial Data"
}

/** An Excel/table result row — key/value pairs */
export interface ExcelResult {
  fileName: string;
  sheetName?: string;
  itemLabel?: string;
  values: Record<string, string | number>[];  // rows of data
}

/** Top-level search result returned to the UI */
export interface SearchResult {
  query: string;
  totalResults: number;
  errors: string[];

  // Structured data for rich rendering
  summaryBlocks: SummaryBlock[];
  excelResults: ExcelResult[];

  // Legacy flat text fallback
  renderedMarkdown: string;
}

// ── Backend response types ───────────────────────────────────

interface BackendReference {
  index?: number;
  title?: string;
  uri?: string;
  web_link?: string;
  gcs_url?: string;
}

interface BackendSummaryBlock {
  summary?: string;
  text?: string;
  references?: BackendReference[];
  label?: string;
}

interface BackendResultItem {
  kind?: string;          // "document" | "excel" | "table" | etc.
  company?: string;
  original_file_name?: string;
  file_name?: string;
  sheet_name?: string;
  item_label?: string;
  entry_labels?: string;
  values?: Record<string, string | number>[];
  rows?: Record<string, string | number>[];
  // ... other fields we can ignore
  [key: string]: unknown;
}

interface BackendSearchData {
  success: boolean;
  source: string;
  query: string;
  company_filter: string;
  total_results: number;
  errors: string[];
  summary?: string;
  summaries?: (string | BackendSummaryBlock)[];
  raw_summaries?: (string | BackendSummaryBlock)[];
  results: BackendResultItem[];
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

// ── Parse helpers ────────────────────────────────────────────

function parseReference(ref: BackendReference, idx: number): SearchReference {
  return {
    index: ref.index ?? idx + 1,
    title: ref.title || `Source ${idx + 1}`,
    uri: ref.uri || ref.web_link || ref.gcs_url || undefined,
  };
}

function parseSummaryBlocks(data: BackendSearchData): SummaryBlock[] {
  const blocks: SummaryBlock[] = [];

  // Try raw_summaries first (structured), then summaries
  const source = data.raw_summaries ?? data.summaries;

  if (source && source.length > 0) {
    source.forEach((item, i) => {
      if (typeof item === 'string') {
        // Plain text summary
        if (item.trim()) {
          blocks.push({
            text: item,
            references: [],
            label: blocks.length === 0 ? 'AI Summary' : `AI Summary ${blocks.length + 1}`,
          });
        }
      } else {
        // Structured summary block
        const text = item.summary || item.text || '';
        const refs = (item.references || []).map((r, ri) => parseReference(r, ri));
        if (text.trim()) {
          blocks.push({
            text,
            references: refs,
            label: item.label || (i === 0 ? 'AI Summary from Documents' : 'AI Summary from Financial Data'),
          });
        }
      }
    });
  }

  // Fallback: if no structured summaries, use the top-level summary string
  if (blocks.length === 0 && data.summary && data.summary.trim()) {
    blocks.push({
      text: data.summary,
      references: [],
      label: 'AI Summary',
    });
  }

  return blocks;
}

function parseExcelResults(results: BackendResultItem[]): ExcelResult[] {
  const excelResults: ExcelResult[] = [];

  for (const item of results) {
    const kind = (item.kind || '').toLowerCase();
    if (kind !== 'excel' && kind !== 'table') continue;

    const rows = item.values || item.rows || [];
    if (!rows || rows.length === 0) continue;

    excelResults.push({
      fileName: item.original_file_name || item.file_name || 'Unknown File',
      sheetName: item.sheet_name,
      itemLabel: item.item_label || item.entry_labels,
      values: rows,
    });
  }

  return excelResults;
}

function parseSearchResponse(raw: BackendEnvelope, query: string): SearchResult {
  const d = raw.data;

  const summaryBlocks = parseSummaryBlocks(d);
  const excelResults = parseExcelResults(d.results || []);

  return {
    query,
    totalResults: d.total_results || 0,
    errors: d.errors || [],
    summaryBlocks,
    excelResults,
    renderedMarkdown: d.rendered_markdown || '',
  };
}

// ── Public API ───────────────────────────────────────────────

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
