import { SupportedMimeType } from '../types/file';

export const ALLOWED_MIME_TYPES: SupportedMimeType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const MAX_DEFAULT_UPLOAD_SIZE_BYTES = 52428800; // 50 MB

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export const FORBIDDEN_EXTENSIONS = [
  // Executables
  '.exe', '.bat', '.cmd', '.ps1', '.sh', '.bin', '.msi', '.com', '.vbs', '.scr',
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso',
  // Scripts / Code
  '.js', '.ts', '.html', '.htm', '.php', '.py', '.rb', '.java', '.c', '.cpp',
  // Macro Documents
  '.docm', '.xlsm', '.pptm'
];

export interface FileValidationInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  maxUploadSizeBytes?: number;
  bytes?: Uint8Array | Buffer;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  safeDisplayName: string;
  detectedMimeType?: string;
}

/**
 * Inspects raw buffer bytes against authoritative file magic signatures.
 * Minimum signatures:
 * - PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WEBP: RIFF....WEBP (RIFF at 0..3, WEBP at 8..11)
 */
export function detectMagicFileType(bytes: Uint8Array | Buffer): { ext: string; mime: string } | null {
  if (!bytes || bytes.length < 4) return null;

  // PDF: %PDF-
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D
  ) {
    return { ext: '.pdf', mime: 'application/pdf' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return { ext: '.png', mime: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // WEBP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Validates file upload for extension, browser MIME type, magic bytes, and size limits.
 * Strict fail-closed policy. Extension, MIME, and raw magic bytes must agree.
 */
export function validateUploadFile(input: FileValidationInput): FileValidationResult {
  const { filename, mimeType, sizeBytes, maxUploadSizeBytes = MAX_DEFAULT_UPLOAD_SIZE_BYTES, bytes } = input;

  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    return { isValid: false, error: 'Filename is required', safeDisplayName: '' };
  }

  // Sanitize filename for display (remove control chars, directory traversal, etc.)
  const baseName = filename.replace(/^.*[\\/]/, '').trim();
  const safeDisplayName = baseName.replace(/[^a-zA-Z0-9._\- ]/g, '_');

  const dotIndex = baseName.lastIndexOf('.');
  if (dotIndex === -1) {
    return { isValid: false, error: 'File must have an explicit extension', safeDisplayName };
  }

  const ext = baseName.slice(dotIndex).toLowerCase();

  // 1. Reject Forbidden Extensions
  if (FORBIDDEN_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `File type "${ext}" is forbidden for security. Only PDF and image documents are accepted.`,
      safeDisplayName
    };
  }

  // 2. Reject Unsupported Extensions
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: `Unsupported file extension "${ext}". Supported formats are: PDF, JPG, JPEG, PNG, WEBP.`,
      safeDisplayName
    };
  }

  // 3. Reject Unsupported MIME Types
  const normalizedMime = (mimeType || '').trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime as SupportedMimeType)) {
    return {
      isValid: false,
      error: `Unsupported MIME type "${normalizedMime}". Only PDF and standard images are accepted.`,
      safeDisplayName
    };
  }

  // 4. Validate Extension Matches MIME Type
  if (ext === '.pdf' && normalizedMime !== 'application/pdf') {
    return {
      isValid: false,
      error: 'Extension .pdf must match application/pdf MIME type',
      safeDisplayName
    };
  }

  if (['.jpg', '.jpeg'].includes(ext) && normalizedMime !== 'image/jpeg') {
    return {
      isValid: false,
      error: 'JPEG image extension must match image/jpeg MIME type',
      safeDisplayName
    };
  }

  if (ext === '.png' && normalizedMime !== 'image/png') {
    return {
      isValid: false,
      error: 'PNG image extension must match image/png MIME type',
      safeDisplayName
    };
  }

  if (ext === '.webp' && normalizedMime !== 'image/webp') {
    return {
      isValid: false,
      error: 'WEBP image extension must match image/webp MIME type',
      safeDisplayName
    };
  }

  // 5. Validate Size Limit
  if (!sizeBytes || sizeBytes <= 0) {
    return { isValid: false, error: 'File size must be greater than 0 bytes', safeDisplayName };
  }

  if (sizeBytes > maxUploadSizeBytes) {
    const maxMb = (maxUploadSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds the shop maximum upload limit of ${maxMb} MB`,
      safeDisplayName
    };
  }

  // 6. Validate Magic Bytes if provided
  if (bytes && bytes.length > 0) {
    const magicInfo = detectMagicFileType(bytes);
    if (!magicInfo) {
      return {
        isValid: false,
        error: `File content magic header does not match any allowed document or image format.`,
        safeDisplayName
      };
    }

    if (magicInfo.mime !== normalizedMime) {
      return {
        isValid: false,
        error: `Security mismatch: File magic bytes indicate "${magicInfo.mime}" but declared MIME is "${normalizedMime}".`,
        safeDisplayName,
        detectedMimeType: magicInfo.mime
      };
    }

    return { isValid: true, safeDisplayName, detectedMimeType: magicInfo.mime };
  }

  return { isValid: true, safeDisplayName };
}
