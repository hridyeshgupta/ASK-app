'use client';

// components/upload/doc-rank-list.tsx
//  "drag-rank all selected docs before generating —
//       ranking passed as weighted context to the agent"

import { useState } from 'react';
import type { UploadedDoc } from '@/lib/types/upload';
import { Badge } from '@/components/ui/badge';
import { GripVerticalIcon, FileTextIcon } from 'lucide-react';

interface DocRankListProps {
  documents: UploadedDoc[];
  onReorder: (reordered: UploadedDoc[]) => void;
}

export function DocRankList({ documents, onReorder }: DocRankListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (documents.length === 0) return null;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...documents];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, removed);
    onReorder(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-1.5">
      {documents.map((doc, index) => (
        <div
          key={doc.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`
            flex items-center gap-3 rounded-lg border p-3 cursor-grab active:cursor-grabbing
            transition-all duration-150
            ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
            ${dragOverIndex === index && draggedIndex !== index ? 'border-primary bg-primary/5' : 'border-border/50 bg-card hover:bg-muted/30'}
          `}
        >
          <GripVerticalIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />

          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
            {index + 1}
          </span>

          <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

          <span className="flex-1 text-sm font-medium truncate">{doc.name}</span>

          <Badge variant={doc.hierarchy === 'primary' ? 'default' : 'secondary'} className="text-xs">
            {doc.hierarchy}
          </Badge>
        </div>
      ))}
    </div>
  );
}
