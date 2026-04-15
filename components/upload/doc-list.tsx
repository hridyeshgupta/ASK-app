'use client';

// components/upload/doc-list.tsx
//  "hierarchy (primary vs secondary)"
// Shows uploaded documents with hierarchy toggle

import type { UploadedDoc } from '@/lib/types/upload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileTextIcon, XIcon, ArrowUpDownIcon } from 'lucide-react';

interface DocListProps {
  documents: UploadedDoc[];
  onRemove: (id: string) => void;
  onToggleHierarchy: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocList({ documents, onRemove, onToggleHierarchy }: DocListProps) {
  if (documents.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowUpDownIcon className="h-3 w-3" />
          Drag to reorder
        </div>
      </div>

      <div className="space-y-1.5">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30"
          >
            {/* Rank number */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>

            {/* File icon */}
            <FileTextIcon className="h-5 w-5 shrink-0 text-muted-foreground" />

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
            </div>

            {/* Hierarchy toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleHierarchy(doc.id)}
              className="h-7 px-2"
              id={`hierarchy-toggle-${doc.id}`}
            >
              <Badge
                variant={doc.hierarchy === 'primary' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {doc.hierarchy}
              </Badge>
            </Button>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(doc.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              id={`remove-doc-${doc.id}`}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
