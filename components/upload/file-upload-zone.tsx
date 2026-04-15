'use client';

// components/upload/file-upload-zone.tsx
// File upload zone for PDF, XLSX, DOCX

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_FILE_EXTENSIONS } from '@/lib/constants';
import { UploadCloudIcon, FileIcon } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFilesSelected, disabled = false }: FileUploadZoneProps) {
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
      id="file-upload-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed
        p-10 text-center transition-all duration-200 cursor-pointer
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
        accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
        onChange={handleChange}
        className="hidden"
        id="file-upload-input"
      />

      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
        <UploadCloudIcon className="h-7 w-7 text-primary" />
      </div>

      <div>
        <p className="text-sm font-medium">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports PDF, XLSX, DOCX
        </p>
      </div>

      <Button variant="outline" size="sm" disabled={disabled} type="button">
        <FileIcon className="mr-2 h-4 w-4" />
        Choose Files
      </Button>
    </div>
  );
}
