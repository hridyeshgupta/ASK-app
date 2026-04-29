'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SearchIcon, SparklesIcon, GlobeIcon, DatabaseIcon, Loader2Icon,
  AlertTriangleIcon, XIcon, CopyIcon, CheckIcon, FileSpreadsheetIcon,
  ExternalLinkIcon, BuildingIcon, ChevronDownIcon, ChevronRightIcon,
  InfoIcon, FileTextIcon,
} from 'lucide-react';
import {
  searchService,
  type SearchResult, type SummaryData, type SearchReference,
  type DocumentResult, type ExcelResult,
} from '@/lib/api/search-service';

interface SearchModalProps { open: boolean; onOpenChange: (open: boolean) => void; }
interface CompanyOption { id: string; name: string; }
interface SearchHistoryEntry {
  id: string; type: 'internal' | 'external'; query: string;
  company?: string; result: SearchResult | null; error: string | null; timestamp: Date;
}

// ── Markdown renderer ─────────────────────────────────────

function md(text: string): string {
  return text
    .replace(/\n\n---\n\n/g, '<div class="my-3 h-px bg-border/40"></div>')
    .replace(/^---$/gm, '<div class="my-3 h-px bg-border/40"></div>')
    .replace(/### (.*)/g, '<h3 class="text-[13px] font-semibold mt-3 mb-1.5 text-foreground">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-sm font-bold mt-3 mb-1.5 text-foreground">$1</h2>')
    .replace(/# (.*)/g, '<h1 class="text-[15px] font-bold mt-3 mb-1.5 text-foreground">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline citations like [D1], [E2], [1], [D1, D2]
    .replace(/\[([DE]?\d+(?:,\s*[DE]?\d+)*)\]/g, '<sup class="text-violet-500 font-bold text-[10px] ml-0.5 cursor-help">[$1]</sup>')
    .replace(/^\*   (.*)/gm, '<div class="flex gap-2 ml-1 my-0.5"><span class="text-muted-foreground mt-0.5">•</span><span>$1</span></div>')
    .replace(/^- (.*)/gm, '<div class="flex gap-2 ml-1 my-0.5"><span class="text-muted-foreground mt-0.5">•</span><span>$1</span></div>')
    .replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>')
    .replace(/\n/g, '<br/>');
}

// ── Sub-components ────────────────────────────────────────

/** Clickable references list below the summary */
function RefsBlock({ refs }: { refs: SearchReference[] }) {
  if (!refs.length) return null;
  return (
    <div className="mt-4 pt-3 border-t border-border/20">
      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/60 mb-2">
        References
      </p>
      <div className="space-y-1">
        {refs.map((r) => (
          <a key={r.tag} href={r.uri} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg hover:bg-violet-500/[0.06] transition-colors group">
            <span className="shrink-0 h-5 min-w-[20px] px-1 flex items-center justify-center rounded-md bg-violet-500/15 text-violet-400 text-[10px] font-bold">
              {r.tag}
            </span>
            <span className="truncate text-blue-400 group-hover:text-blue-300 transition-colors">{r.title}</span>
            <ExternalLinkIcon className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-blue-400 transition-colors ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Single synthesised AI summary */
function SummaryBlock({ data }: { data: SummaryData }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <SparklesIcon className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400/70">AI Summary</span>
      </div>
      <div className="text-[13px] leading-[1.8] text-foreground/85" dangerouslySetInnerHTML={{ __html: md(data.text) }} />
      <RefsBlock refs={data.references} />
    </div>
  );
}

/** Document results — clickable file list */
function DocResults({ docs }: { docs: DocumentResult[] }) {
  if (!docs.length) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <FileTextIcon className="h-3 w-3 text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">Source Documents</span>
      </div>
      <div className="space-y-1">
        {docs.map((d, i) => (
          <a key={i} href={d.webLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg border border-border/20 hover:border-blue-500/30 hover:bg-blue-500/[0.04] transition-all group">
            <FileTextIcon className="h-4 w-4 text-blue-400/60 shrink-0" />
            <span className="truncate text-foreground/80 group-hover:text-blue-400 transition-colors font-medium">{d.filename}</span>
            <ExternalLinkIcon className="h-3 w-3 shrink-0 text-muted-foreground/30 group-hover:text-blue-400 transition-colors ml-auto" />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Excel/table data card */
function ExcelCard({ data }: { data: ExcelResult }) {
  const [open, setOpen] = useState(false);
  const hasRows = data.rows.length > 0;

  return (
    <div className="rounded-lg border border-emerald-500/15 overflow-hidden bg-emerald-500/[0.02]">
      <button onClick={() => hasRows && setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-emerald-500/[0.05] transition-colors text-left ${!hasRows ? 'cursor-default' : ''}`}>
        <FileSpreadsheetIcon className="h-4 w-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground/90 truncate">{data.itemLabel}</p>
            {data.unit && <span className="text-[9px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">{data.unit}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {data.path && <span className="text-[10px] text-muted-foreground/60 truncate">{data.path}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground/50 truncate">{data.fileName}</span>
            {data.sheetName && <span className="text-[10px] text-muted-foreground/50">Sheet: {data.sheetName}</span>}
          </div>
        </div>
        {hasRows && (
          <>
            <span className="text-[9px] text-emerald-400/60 font-medium shrink-0">{data.rows.length} rows</span>
            {open ? <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
          </>
        )}
        {!hasRows && <span className="text-[9px] text-muted-foreground/40 shrink-0">No data rows</span>}
      </button>
      {open && hasRows && (
        <div className="overflow-x-auto max-h-64 border-t border-emerald-500/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-emerald-500/[0.04] hover:bg-emerald-500/[0.04]">
                {data.columns.map(c => (
                  <TableHead key={c} className="text-[10px] font-bold uppercase tracking-wider h-7 px-3 text-emerald-500/60">{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, i) => (
                <TableRow key={i} className="hover:bg-emerald-500/[0.02]">
                  {data.columns.map(c => {
                    const val = row[c];
                    const formatted = typeof val === 'number' ? val.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(val ?? '');
                    return <TableCell key={c} className="text-xs px-3 py-1.5 text-foreground/75 tabular-nums">{formatted}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/** Full result display for a search entry */
function ResultContent({ entry }: { entry: SearchHistoryEntry }) {
  if (entry.error) return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/15">
      <AlertTriangleIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-400/90 leading-relaxed">{entry.error}</p>
    </div>
  );
  if (!entry.result) return null;

  const { summary, documentResults, excelResults, renderedMarkdown, totalResults, errors } = entry.result;

  return (
    <div className="space-y-4">
      {/* Result count */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          totalResults > 0
            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
            : 'bg-muted/50 text-muted-foreground ring-1 ring-border/50'
        }`}>
          {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
        </span>
      </div>

      {/* AI Summary (single synthesised answer) */}
      {summary && summary.text && <SummaryBlock data={summary} />}

      {/* Source Documents */}
      {documentResults.length > 0 && (
        <>
          {summary && <div className="h-px bg-border/20" />}
          <DocResults docs={documentResults} />
        </>
      )}

      {/* Excel / Financial Data Tables */}
      {excelResults.length > 0 && (
        <>
          <div className="h-px bg-border/20" />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <FileSpreadsheetIcon className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">Financial Data</span>
              <span className="text-[9px] text-muted-foreground/40 ml-1">{excelResults.length} table{excelResults.length !== 1 ? 's' : ''}</span>
            </div>
            {excelResults.map((d, i) => <ExcelCard key={i} data={d} />)}
          </div>
        </>
      )}

      {/* Fallback: rendered markdown if no structured data */}
      {!summary && documentResults.length === 0 && excelResults.length === 0 && renderedMarkdown && (
        <div className="text-[13px] leading-[1.7] text-foreground/85" dangerouslySetInnerHTML={{ __html: md(renderedMarkdown) }} />
      )}

      {/* Warnings */}
      {errors?.length > 0 && totalResults === 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 text-xs">
          <InfoIcon className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-amber-400/80 leading-relaxed space-y-0.5">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [company, setCompany] = useState('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchType, setSearchType] = useState<'internal' | 'external' | null>(null);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCompLoading(true);
    fetch('/api/companies?module=pc')
      .then(r => r.json())
      .then(d => setCompanies((d.companies || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))))
      .catch(() => setCompanies([]))
      .finally(() => setCompLoading(false));
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const doSearch = useCallback(async (type: 'internal' | 'external') => {
    if (!query.trim() || searching) return;
    setSearching(true); setSearchType(type);
    const id = crypto.randomUUID();
    const compName = companies.find(c => c.id === company)?.name || '';
    try {
      const result = type === 'internal'
        ? await searchService.internalSearch(query.trim(), compName)
        : await searchService.externalSearch(query.trim());
      setHistory(p => [...p, { id, type, query: query.trim(), company: compName, result, error: null, timestamp: new Date() }]);
    } catch (err) {
      setHistory(p => [...p, { id, type, query: query.trim(), company: compName, result: null, error: err instanceof Error ? err.message : 'Search failed.', timestamp: new Date() }]);
    } finally { setSearching(false); setSearchType(null); }
  }, [query, searching, company, companies]);

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  };

  const getText = (e: SearchHistoryEntry) => {
    if (!e.result) return '';
    return e.result.summary?.text || e.result.renderedMarkdown || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] !max-h-[85vh] !flex !flex-col p-0 gap-0 overflow-hidden rounded-2xl" showCloseButton={false}>

        {/* ── Header ── */}
        <div className="relative px-5 pt-4 pb-3 border-b border-border/40 bg-gradient-to-r from-violet-500/[0.04] to-blue-500/[0.04] shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-[15px] font-semibold">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/25 to-blue-500/25 flex items-center justify-center ring-1 ring-violet-500/15">
                <SparklesIcon className="h-3.5 w-3.5 text-violet-400" />
              </div>
              Custom Search
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              AI-powered search across your internal documents and the web
            </DialogDescription>
          </DialogHeader>
          <button onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── Chat / Results Area ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {history.length === 0 && !searching ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center ring-1 ring-violet-500/10 mb-4">
                  <SearchIcon className="h-6 w-6 text-violet-400/70" />
                </div>
                <p className="text-sm font-medium text-foreground/70 mb-1">Ask anything</p>
                <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                  Type your query and search through <span className="text-violet-400 font-medium">internal documents</span> or the <span className="text-blue-400 font-medium">web</span>. Results are AI-summarised.
                </p>
              </div>
            ) : (
              <>
                {history.length > 0 && (
                  <div className="flex justify-end">
                    <button onClick={() => setHistory([])}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/40">
                      <XIcon className="h-2.5 w-2.5" /> Clear
                    </button>
                  </div>
                )}

                {history.map(entry => (
                  <div key={entry.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-2">
                    {/* User query bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-violet-500/15 rounded-2xl rounded-br-md px-4 py-2.5">
                        <p className="text-sm font-medium text-foreground/90">{entry.query}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                            entry.type === 'internal' ? 'bg-violet-500/20 text-violet-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>{entry.type === 'internal' ? 'Internal' : 'Web'}</span>
                          {entry.company && (
                            <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5">
                              <BuildingIcon className="h-2.5 w-2.5" />{entry.company}
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground/60 ml-auto">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI response card */}
                    <div className="group relative bg-card/40 rounded-2xl rounded-tl-md border border-border/30 p-4 hover:border-border/50 transition-colors">
                      <ResultContent entry={entry} />
                      {entry.result && (
                        <button onClick={() => copy(getText(entry), entry.id)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground" title="Copy">
                          {copiedId === entry.id ? <CheckIcon className="h-3.5 w-3.5 text-emerald-400" /> : <CopyIcon className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {searching && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-violet-500/15 rounded-2xl rounded-br-md px-4 py-2.5">
                        <p className="text-sm font-medium text-foreground/90">{query}</p>
                      </div>
                    </div>
                    <div className="bg-card/40 rounded-2xl rounded-tl-md border border-border/30 p-5 flex items-center justify-center gap-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-violet-400/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-violet-400/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {searchType === 'internal' ? 'Searching documents...' : 'Searching the web...'}
                      </p>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </>
            )}
          </div>
        </div>

        {/* ── Input Area ── */}
        <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-3 space-y-2.5 shrink-0">
          {/* Company filter */}
          <div className="flex items-center gap-2">
            <BuildingIcon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger id="search-company-filter" className="h-7 text-xs w-auto min-w-[140px] max-w-[200px] rounded-lg bg-muted/30 border-border/30">
                <SelectValue placeholder={compLoading ? 'Loading...' : 'All companies'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {company && company !== 'all' && (
              <button onClick={() => setCompany('')} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted/40">
                <XIcon className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 bg-muted/25 rounded-xl border border-border/40 px-3 py-1.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500/30 transition-all">
            <SearchIcon className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              id="search-query-input"
              type="text"
              placeholder="Ask a question..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSearch('internal'); } }}
              disabled={searching}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 disabled:opacity-50 py-1.5"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <Button id="search-internal-btn" onClick={() => doSearch('internal')} disabled={!query.trim() || searching}
                size="sm" className="h-7 px-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-xs gap-1 shadow-sm shadow-violet-500/25">
                {searching && searchType === 'internal' ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <DatabaseIcon className="h-3 w-3" />}
                <span className="hidden sm:inline">Internal</span>
              </Button>
              <Button id="search-external-btn" onClick={() => doSearch('external')} disabled={!query.trim() || searching}
                size="sm" variant="outline" className="h-7 px-2.5 rounded-lg text-xs gap-1 border-blue-500/25 text-blue-500 hover:bg-blue-500/10">
                {searching && searchType === 'external' ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <GlobeIcon className="h-3 w-3" />}
                <span className="hidden sm:inline">Web</span>
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center">Press Enter for internal search</p>
        </div>

      </DialogContent>
    </Dialog>
  );
}
