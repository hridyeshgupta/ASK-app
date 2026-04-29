// lib/api/search-service.ts
// API integration for Custom Search (Internal + External).
// Backend endpoints:
//   GET /internal-search?query=...&company=...
//   GET /external-search?query=...
// Both are proxied through /api/proxy/* to avoid CORS.

// ── Structured types for rich rendering ──────────────────────

/** A single reference cited in the AI summary */
export interface SearchReference {
  tag: string;           // e.g. "D1", "E2", "1"
  title: string;         // document / file name
  uri: string;           // clickable link (GCS URL or web link)
}

/** The synthesised AI summary with extracted references */
export interface SummaryData {
  text: string;                    // the AI-generated summary markdown (without the References block)
  references: SearchReference[];   // extracted [D1], [E2] etc. references with links
}

/** A document result from the search */
export interface DocumentResult {
  filename: string;
  company: string;
  webLink: string;         // clickable https:// URL
  gcsUri: string;          // gs:// URI
  snippets: string[];
}

/** An Excel/table result with pre-structured table data */
export interface ExcelResult {
  fileName: string;
  sheetName: string;
  itemLabel: string;
  unit: string;
  path: string;            // e.g. "Profit & Loss > Revenue > Total Revenue"
  columns: string[];       // e.g. ["Period", "Value"]
  rows: Record<string, string | number>[];
}

/** Top-level search result returned to the UI */
export interface SearchResult {
  query: string;
  totalResults: number;
  errors: string[];

  // Structured data
  summary: SummaryData | null;        // single synthesised AI summary
  documentResults: DocumentResult[];  // document-kind results
  excelResults: ExcelResult[];        // excel/table-kind results

  // Legacy flat text fallback
  renderedMarkdown: string;
}

// ── Backend response types ───────────────────────────────────

interface BackendResultItem {
  kind?: string;
  company?: string;
  original_filename?: string;
  gcs_uri?: string;
  web_link?: string;
  snippets?: string[];
  sheet_name?: string;
  item_label?: string;
  unit?: string;
  path?: string;
  values?: Record<string, number>;
  table?: {
    columns: string[];
    rows: Record<string, string | number>[];
  };
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
  raw_summaries?: string[];
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

/**
 * Parse the `summary` field which looks like:
 *   ### Synthesised Answer\n\n...text...[D1]...\n\n**References:**\n[D1] [Title](url)\n[E2] [Title](url)
 *
 * Extracts the text (before **References:**) and the references list.
 */
function parseSummary(summaryStr: string): SummaryData {
  if (!summaryStr || !summaryStr.trim()) {
    return { text: '', references: [] };
  }

  // Split at **References:** to separate text from reference list
  const refSplitIndex = summaryStr.indexOf('**References:**');
  let textPart: string;
  let refsPart: string;

  if (refSplitIndex !== -1) {
    textPart = summaryStr.substring(0, refSplitIndex).trim();
    refsPart = summaryStr.substring(refSplitIndex + '**References:**'.length).trim();
  } else {
    textPart = summaryStr.trim();
    refsPart = '';
  }

  // Parse references: each line looks like [D1] [Title](url) or [1] [Title](url)
  const references: SearchReference[] = [];
  if (refsPart) {
    // Match lines like: [D1] [Some Title](https://some.url/path)
    const refRegex = /\[([^\]]+)\]\s+\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = refRegex.exec(refsPart)) !== null) {
      references.push({
        tag: match[1],       // "D1", "E2", etc.
        title: match[2],     // document title
        uri: match[3],       // URL
      });
    }
  }

  return { text: textPart, references };
}

function parseDocumentResults(results: BackendResultItem[]): DocumentResult[] {
  const docs: DocumentResult[] = [];
  const seen = new Set<string>(); // deduplicate by filename

  for (const item of results) {
    if (item.kind !== 'document') continue;
    const filename = item.original_filename || 'Document';

    // Deduplicate — backend returns same doc from raw_files/ and uploads/
    if (seen.has(filename)) continue;
    seen.add(filename);

    docs.push({
      filename,
      company: item.company || '',
      webLink: item.web_link || '',
      gcsUri: item.gcs_uri || '',
      snippets: (item.snippets || []).filter(Boolean),
    });
  }

  return docs;
}

function parseExcelResults(results: BackendResultItem[]): ExcelResult[] {
  const excelResults: ExcelResult[] = [];

  for (const item of results) {
    if (item.kind !== 'excel' && item.kind !== 'table') continue;

    // Use pre-structured table data from backend
    const table = item.table;
    const rows = table?.rows || [];

    // Skip tables with no data rows
    if (rows.length === 0) continue;

    excelResults.push({
      fileName: item.original_filename || 'Unknown File',
      sheetName: item.sheet_name || '',
      itemLabel: item.item_label || 'N/A',
      unit: (item.unit as string) || '',
      path: (item.path as string) || '',
      columns: table?.columns || ['Period', 'Value'],
      rows,
    });
  }

  return excelResults;
}

function parseSearchResponse(raw: BackendEnvelope, query: string): SearchResult {
  const d = raw.data;

  // Use `summary` (synthesised answer) as the single AI summary
  const summary = d.summary ? parseSummary(d.summary) : null;
  const documentResults = parseDocumentResults(d.results || []);
  const excelResults = parseExcelResults(d.results || []);

  return {
    query,
    totalResults: d.total_results || 0,
    errors: d.errors || [],
    summary,
    documentResults,
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
