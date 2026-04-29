'use client';

// lib/hooks/use-upload.ts
// Manages three separate file categories and handles real upload to POST /upload

import { useState, useCallback } from 'react';
import { pcService } from '@/lib/api/pc-service';

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export function useUpload() {
  const [presentations, setPresentations] = useState<UploadedFile[]>([]);
  const [financials, setFinancials] = useState<UploadedFile[]>([]);
  const [otherDocs, setOtherDocs] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const addPresentations = useCallback((files: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file, i) => ({
      id: `pres-${Date.now()}-${i}`,
      file,
      name: file.name,
      size: file.size,
    }));
    setPresentations((prev) => [...prev, ...newFiles]);
    setUploadSuccess(false);
    setUploadError(null);
  }, []);

  const addFinancials = useCallback((files: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file, i) => ({
      id: `fin-${Date.now()}-${i}`,
      file,
      name: file.name,
      size: file.size,
    }));
    setFinancials((prev) => [...prev, ...newFiles]);
    setUploadSuccess(false);
    setUploadError(null);
  }, []);

  const addOtherDocs = useCallback((files: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file, i) => ({
      id: `other-${Date.now()}-${i}`,
      file,
      name: file.name,
      size: file.size,
    }));
    setOtherDocs((prev) => [...prev, ...newFiles]);
    setUploadSuccess(false);
    setUploadError(null);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPresentations((prev) => prev.filter((f) => f.id !== id));
    setFinancials((prev) => prev.filter((f) => f.id !== id));
    setOtherDocs((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Real upload — sends three file categories to POST /upload
  // Returns the backend response which includes upload_job_id for polling
  const uploadDocuments = useCallback(async (companyName: string) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      if (presentations.length === 0) {
        throw new Error('At least one PDF is required (Investor Presentations).');
      }
      if (financials.length === 0) {
        throw new Error('At least one Excel file is required (Financial Models).');
      }

      const response = await pcService.uploadDocuments(
        companyName,
        presentations.map((f) => f.file),
        financials.map((f) => f.file),
        otherDocs.length > 0 ? otherDocs.map((f) => f.file) : undefined,
      );

      setUploadSuccess(true);
      return response;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [presentations, financials, otherDocs]);

  const clearAll = useCallback(() => {
    setPresentations([]);
    setFinancials([]);
    setOtherDocs([]);
    setUploadSuccess(false);
    setUploadError(null);
  }, []);

  const totalFiles = presentations.length + financials.length + otherDocs.length;

  return {
    presentations,
    financials,
    otherDocs,
    totalFiles,
    isUploading,
    uploadError,
    uploadSuccess,
    addPresentations,
    addFinancials,
    addOtherDocs,
    removeFile,
    uploadDocuments,
    clearAll,
  };
}
