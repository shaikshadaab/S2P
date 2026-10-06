import { PrintOrientation } from './order';

export type DocumentClassification =
  | 'CARD_SMALL'
  | 'CARD_LARGE'
  | 'DOCUMENT_A4'
  | 'PHOTO'
  | 'PDF_DOCUMENT'
  | 'UNKNOWN';

export type CardLayoutMode =
  | 'SMALL_CARD'
  | 'LARGE_CARD'
  | 'ORIGINAL'
  | 'FIT_PAGE';

export interface DocumentCropMetadata {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  perspectivePoints?: { x: number; y: number }[];
}

export interface DocumentSide {
  fileId: string;
  filename?: string;
  mimeType?: string;
  originalUrl?: string;
  processedUrl?: string;
  storagePath?: string;
  crop?: DocumentCropMetadata;
  rotation: number;
  confidence: number;
}

export interface DocumentGroup {
  id: string; // documentGroupId
  name?: string;
  front: DocumentSide;
  back?: DocumentSide | null;
  documentType: DocumentClassification;
  confidence: number;
  layoutMode: CardLayoutMode;
  orientation: PrintOrientation;
  status: 'DETECTED' | 'MANUALLY_CONFIRMED';
  createdAt?: string;
  updatedAt?: string;
}

export interface PrintMasterSnapshot {
  printMasterFileId: string;
  storagePath: string;
  downloadUrl?: string;
  sha256: string;
  pageCount: number;
  sizeBytes: number;
  layoutVersion: string;
  layoutMode: CardLayoutMode;
  createdAt: string;
}
