'use client';

// components/upload/file-upload-zone.tsx
// Reusable file upload zone — supports per-category labels and accepted file types

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloudIcon, FileIcon } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  accept?: string;
  id?: string;
}

export function FileUploadZone({
  onFilesSelected,
  disabled = false,
  label = 'Drop files here or click to browse',
  description = 'Supports PDF, XLSX, DOCX',
  accept = '.pdf,.xlsx,.docx',
  id = 'file-upload-zone',
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      id={id}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
        p-6 text-center transition-all duration-200 cursor-pointer
        ${disabled
          ? 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
          : 'border-border/60 hover:border-primary/40 hover:bg-muted/30 bg-muted/10'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="hidden"
        id={`${id}-input`}
      />

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <UploadCloudIcon className="h-6 w-6 text-primary" />
      </div>

      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <Button variant="outline" size="sm" disabled={disabled} type="button">
        <FileIcon className="mr-2 h-4 w-4" />
        Choose Files
      </Button>
    </div>
  );
}
