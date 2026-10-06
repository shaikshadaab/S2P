import { PDFDocument } from 'pdf-lib';

export interface PdfMetadata {
  isValid: boolean;
  pageCount: number;
  pdfVersion?: string;
  isEncrypted?: boolean;
}

/**
 * Server-authoritative PDF structure validator and page count extractor using pdf-lib.
 * Handles normal compressed PDFs, object streams, and rejects malformed or password-protected files.
 */
export async function parsePdfMetadata(buffer: Buffer | Uint8Array): Promise<PdfMetadata> {
  if (!buffer || buffer.length < 5) {
    throw new Error('PDF_UNREADABLE: Buffer is empty or too small');
  }

  const header = Buffer.from(buffer.slice(0, 5)).toString('latin1');
  if (header !== '%PDF-') {
    throw new Error('PDF_UNREADABLE: Missing "%PDF-" magic header');
  }

  try {
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      updateMetadata: false
    });
    const pageCount = pdfDoc.getPageCount();
    if (pageCount < 1) {
      throw new Error('PDF_UNREADABLE: Document contains zero pages');
    }
    return {
      isValid: true,
      pageCount,
      pdfVersion: '1.4'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('encrypted') || msg.toLowerCase().includes('password')) {
      throw new Error('PDF_PASSWORD_PROTECTED: Password-protected or encrypted PDF files are not supported');
    }
    throw new Error(`PDF_UNREADABLE: Malformed or unreadable PDF: ${msg}`);
  }
}

export async function isValidPdf(buffer: Buffer | Uint8Array): Promise<boolean> {
  try {
    const meta = await parsePdfMetadata(buffer);
    return meta.isValid;
  } catch {
    return false;
  }
}

export async function extractPdfPageCount(buffer: Buffer | Uint8Array): Promise<number> {
  const meta = await parsePdfMetadata(buffer);
  return meta.pageCount;
}
