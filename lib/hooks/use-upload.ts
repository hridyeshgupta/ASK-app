'use client';

// lib/hooks/use-upload.ts
import { useState, useCallback } from 'react';
import type { UploadedDoc, DocHierarchy } from '@/lib/types/upload';

export function useUpload() {
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newDocs: UploadedDoc[] = Array.from(files).map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      hierarchy: 'primary' as DocHierarchy,
      rank: documents.length + index + 1,
    }));

    setDocuments((prev) => [...prev, ...newDocs]);
  }, [documents.length]);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      return filtered.map((d, i) => ({ ...d, rank: i + 1 }));
    });
  }, []);

  const toggleHierarchy = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, hierarchy: d.hierarchy === 'primary' ? 'secondary' : 'primary' }
          : d
      )
    );
  }, []);

  const reorderDocuments = useCallback((reordered: UploadedDoc[]) => {
    setDocuments(reordered.map((d, i) => ({ ...d, rank: i + 1 })));
  }, []);

  const uploadDocuments = useCallback(async (_companyName: string) => {
    setIsUploading(true);
    try {
      // TODO: Call API service when backend is ready
    } finally {
      setIsUploading(false);
    }
  }, []);

  const clearDocuments = useCallback(() => {
    setDocuments([]);
  }, []);

  return {
    documents,
    isUploading,
    addFiles,
    removeDocument,
    toggleHierarchy,
    reorderDocuments,
    uploadDocuments,
    clearDocuments,
  };
}
