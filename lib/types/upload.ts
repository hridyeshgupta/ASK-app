// lib/types/upload.ts
//  "hierarchy on docs (primary vs secondary)"
export type DocHierarchy = 'primary' | 'secondary';

//  "drag-rank all selected docs"
export interface UploadedDoc {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  hierarchy: DocHierarchy;
  rank: number;
}
