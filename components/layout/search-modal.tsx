'use client';

// components/layout/search-modal.tsx
// Custom Search Modal — Independent feature (ASK-19).
// Opens from the Gemini sparkle button in the sidebar.
// Text input for query + two buttons: Internal Search & External Search.
// Results display as formatted text/paragraphs in the same modal.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  SearchIcon,
  SparklesIcon,
  GlobeIcon,
  DatabaseIcon,
  Loader2Icon,
  AlertTriangleIcon,
  XIcon,
  ClockIcon,
  CopyIcon,
  CheckIcon,
} from 'lucide-react';
import { searchService, type SearchResult } from '@/lib/api/search-service';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchHistoryEntry {
  id: string;
  type: 'internal' | 'external';
  query: string;
  result: SearchResult | null;
  error: string | null;
  timestamp: Date;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'internal' | 'external' | null>(null);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  // Scroll to bottom when new result arrives
  useEffect(() => {
    if (resultsEndRef.current) {
      resultsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const handleSearch = useCallback(
    async (type: 'internal' | 'external') => {
      if (!query.trim() || isSearching) return;

      setIsSearching(true);
      setSearchType(type);

      const entryId = crypto.randomUUID();

      try {
        const result =
          type === 'internal'
            ? await searchService.internalSearch(query.trim())
            : await searchService.externalSearch(query.trim());

        setHistory((prev) => [
          ...prev,
          {
            id: entryId,
            type,
            query: query.trim(),
            result,
            error: null,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed. Please try again.';
        setHistory((prev) => [
          ...prev,
          {
            id: entryId,
            type,
            query: query.trim(),
            result: null,
            error: message,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsSearching(false);
        setSearchType(null);
      }
    },
    [query, isSearching],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch('internal');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 ring-1 ring-violet-500/20">
                <SparklesIcon className="h-4.5 w-4.5 text-violet-500" />
              </div>
              Custom Search
            </DialogTitle>
            <DialogDescription className="mt-1">
              Search through internal knowledge base or the web. Results are AI-summarised.
            </DialogDescription>
          </DialogHeader>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Results area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4">
            {history.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 ring-1 ring-violet-500/10 mb-5">
                  <SearchIcon className="h-7 w-7 text-violet-400/80" />
                </div>
                <p className="text-sm font-medium text-foreground/80 mb-1.5">
                  Start a search
                </p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Enter a query below and choose{' '}
                  <span className="text-violet-500 font-medium">Internal Search</span> to query
                  your uploaded documents, or{' '}
                  <span className="text-blue-500 font-medium">External Search</span> for web
                  results.
                </p>
              </div>
            ) : (
              <>
                {/* Clear history button */}
                {history.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={clearHistory}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <XIcon className="h-3 w-3" />
                      Clear history
                    </button>
                  </div>
                )}

                {/* History entries */}
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group rounded-xl border border-border/50 bg-card/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {/* Query header */}
                    <div className="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/30">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md mt-0.5 ${
                          entry.type === 'internal'
                            ? 'bg-violet-500/15 text-violet-500'
                            : 'bg-blue-500/15 text-blue-500'
                        }`}
                      >
                        {entry.type === 'internal' ? (
                          <DatabaseIcon className="h-3.5 w-3.5" />
                        ) : (
                          <GlobeIcon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{entry.query}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              entry.type === 'internal'
                                ? 'bg-violet-500/10 text-violet-500'
                                : 'bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            {entry.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ClockIcon className="h-2.5 w-2.5" />
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Result body */}
                    <div className="px-4 py-3 relative">
                      {entry.error ? (
                        <div className="flex items-start gap-2.5 text-sm">
                          <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-amber-600 dark:text-amber-400">{entry.error}</p>
                        </div>
                      ) : entry.result ? (
                        <>
                          {/* Result count badge */}
                          {entry.result.totalResults !== undefined && (
                            <div className="mb-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                entry.result.totalResults > 0
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                {entry.result.totalResults} result{entry.result.totalResults !== 1 ? 's' : ''} found
                              </span>
                            </div>
                          )}
                          {/* Rendered markdown content */}
                          <div
                            className="text-sm leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert max-w-none
                              prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                              prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5"
                            dangerouslySetInnerHTML={{
                              __html: entry.result.summary
                                .replace(/### (.*)/g, '<h3>$1</h3>')
                                .replace(/## (.*)/g, '<h2>$1</h2>')
                                .replace(/# (.*)/g, '<h1>$1</h1>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>')
                                .replace(/\n/g, '<br />')
                            }}
                          />
                          {entry.result.sources && entry.result.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                Sources
                              </p>
                              <div className="space-y-1">
                                {entry.result.sources.map((src, i) => (
                                  <p
                                    key={i}
                                    className="text-xs text-muted-foreground truncate"
                                  >
                                    {src}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Copy button */}
                          <button
                            onClick={() =>
                              copyToClipboard(entry.result!.summary, entry.id)
                            }
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                            title="Copy to clipboard"
                          >
                            {copiedId === entry.id ? (
                              <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <CopyIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isSearching && (
                  <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/30">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                          searchType === 'internal'
                            ? 'bg-violet-500/15 text-violet-500'
                            : 'bg-blue-500/15 text-blue-500'
                        }`}
                      >
                        {searchType === 'internal' ? (
                          <DatabaseIcon className="h-3.5 w-3.5" />
                        ) : (
                          <GlobeIcon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <p className="text-sm font-medium">{query}</p>
                    </div>
                    <div className="px-4 py-6 flex items-center justify-center gap-3">
                      <Loader2Icon className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {searchType === 'internal'
                          ? 'Searching internal knowledge base...'
                          : 'Searching the web...'}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={resultsEndRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Input area — pinned to bottom */}
        <div className="border-t border-border/50 bg-background px-5 py-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              id="search-query-input"
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none text-sm pr-4 pb-14 rounded-xl border-border/60 focus-visible:ring-violet-500/30"
              disabled={isSearching}
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <Button
                id="search-internal-btn"
                onClick={() => handleSearch('internal')}
                disabled={!query.trim() || isSearching}
                size="sm"
                className="gap-1.5 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white shadow-sm shadow-violet-500/20"
              >
                {isSearching && searchType === 'internal' ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <DatabaseIcon className="h-3.5 w-3.5" />
                )}
                Internal Search
              </Button>
              <Button
                id="search-external-btn"
                onClick={() => handleSearch('external')}
                disabled={!query.trim() || isSearching}
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 rounded-lg border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
              >
                {isSearching && searchType === 'external' ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <GlobeIcon className="h-3.5 w-3.5" />
                )}
                External Search
              </Button>
              <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">
                Enter ↵ for internal search
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
