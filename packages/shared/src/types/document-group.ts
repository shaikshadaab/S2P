import { PrintOrientation } from './order';

export type CustomerPrintMode = 'DOCUMENTS' | 'IMAGES' | 'CARDS';

export type QualityScore = 'GOOD' | 'ACCEPTABLE' | 'LOW_QUALITY' | 'RETAKE_RECOMMENDED';

export type PrintReadinessScore = 'READY' | 'READY_WITH_WARNING' | 'NEEDS_CONFIRMATION' | 'INVALID';

export type MultiUpLayoutMode =
  | 'ONE_PER_PAGE'
  | 'MULTI_UP_2'
  | 'MULTI_UP_4'
  | 'MULTI_UP_6'
  | 'MULTI_UP_8'
  | 'SPLIT_ACROSS_PAGES';

export type DocumentClassification =
  | 'DOCUMENT_PAGE'
  | 'PDF_DOCUMENT'
  | 'CARD_SMALL'
  | 'CARD_LARGE'
  | 'PHOTO'
  | 'PASSPORT_PHOTO_SOURCE'
  | 'CERTIFICATE'
  | 'FORM'
  | 'DOCUMENT_A4'
  | 'UNKNOWN';

export type CardLayoutMode =
  | 'SMALL_CARD'
  | 'LARGE_CARD'
  | 'ORIGINAL'
  | 'FIT_PAGE'
  | 'PASSPORT_PHOTO_SHEET'
  | 'ONE_PER_PAGE'
  | 'MULTI_UP_2'
  | 'MULTI_UP_4'
  | 'MULTI_UP_6'
  | 'MULTI_UP_8'
  | 'SPLIT_ACROSS_PAGES';

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
  sortOrder?: number;
  qualityScore?: QualityScore;
  glareDetected?: boolean;
  blurScore?: number;
  estimatedDpi?: number;
  isBlank?: boolean;
  isDuplicate?: boolean;
  duplicateOfFileId?: string;
  qualityWarning?: string;
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
  sortOrder?: number;
  readinessScore?: PrintReadinessScore;
  readinessReason?: string;
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
