import yauzl from 'yauzl';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';

export interface OfficeConversionResult {
  success: boolean;
  pdfBytes?: Uint8Array;
  pageCount?: number;
  sha256?: string;
  detectedFormat?: 'DOCX' | 'PPTX';
  error?: string;
  errorCode?:
    | 'INVALID_OPENXML'
    | 'FORBIDDEN_MACRO'
    | 'XLSX_DISABLED'
    | 'UNSUPPORTED_OFFICE_FORMAT'
    | 'ZIP_BOMB_LIMIT_EXCEEDED'
    | 'CONVERSION_FAILED';
}

const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_ZIP_ENTRIES = 500;

/**
 * Extracts and unzips an in-memory buffer safely with strict guards:
 * - Checks for macro / executable binaries
 * - Bounded entry count and total size
 */
function inspectAndExtractZip(buffer: Buffer): Promise<{
  entries: Map<string, Buffer>;
  hasVbaMacro: boolean;
  isXlsx: boolean;
  isDocx: boolean;
  isPptx: boolean;
}> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(new Error('INVALID_OPENXML: Failed to parse OpenXML zip container.'));
      }

      const entries = new Map<string, Buffer>();
      let totalBytes = 0;
      let entryCount = 0;
      let hasVbaMacro = false;
      let isXlsx = false;
      let isDocx = false;
      let isPptx = false;

      zipfile.readEntry();

      zipfile.on('entry', (entry: yauzl.Entry) => {
        entryCount++;
        if (entryCount > MAX_ZIP_ENTRIES) {
          zipfile.close();
          return reject(new Error('ZIP_BOMB_LIMIT_EXCEEDED: Office document exceeds safe archive entry count limit.'));
        }

        const fileName = entry.fileName.toLowerCase();

        // Macro / Executable Detection
        if (
          fileName.includes('vbaproject.bin') ||
          fileName.includes('vba') ||
          fileName.endsWith('.bin') ||
          fileName.endsWith('.exe') ||
          fileName.endsWith('.vbs') ||
          fileName.endsWith('.bat')
        ) {
          hasVbaMacro = true;
        }

        if (fileName.startsWith('xl/')) isXlsx = true;
        if (fileName.startsWith('word/')) isDocx = true;
        if (fileName.startsWith('ppt/')) isPptx = true;

        // We only buffer XML content required for conversion
        const isNeeded =
          fileName === 'word/document.xml' ||
          fileName === 'ppt/presentation.xml' ||
          (fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml'));

        if (!isNeeded) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.readEntry();
            return;
          }

          const chunks: Buffer[] = [];
          readStream.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
              zipfile.close();
              return reject(new Error('ZIP_BOMB_LIMIT_EXCEEDED: Office document exceeds safe uncompressed size limit.'));
            }
            chunks.push(chunk);
          });

          readStream.on('end', () => {
            entries.set(entry.fileName, Buffer.concat(chunks));
            zipfile.readEntry();
          });

          readStream.on('error', () => {
            zipfile.readEntry();
          });
        });
      });

      zipfile.on('end', () => {
        resolve({ entries, hasVbaMacro, isXlsx, isDocx, isPptx });
      });

      zipfile.on('error', (zipErr) => {
        reject(zipErr);
      });
    });
  });
}

/**
 * Extracts clean text from Word OpenXML (<w:p>, <w:t>)
 */
function extractDocxParagraphs(documentXml: string): Array<{ text: string; isHeading: boolean }> {
  const paragraphs: Array<{ text: string; isHeading: boolean }> = [];
  const pRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(documentXml)) !== null) {
    const pContent = pMatch[1];
    const isHeading =
      pContent.includes('<w:pStyle w:val="Heading') ||
      pContent.includes('<w:pStyle w:val="Title');

    const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let pText = '';

    while ((tMatch = tRegex.exec(pContent)) !== null) {
      // Decode standard XML entities
      const clean = tMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      pText += clean;
    }

    const trimmed = pText.trim();
    if (trimmed) {
      paragraphs.push({ text: trimmed, isHeading });
    }
  }

  return paragraphs;
}

/**
 * Extracts slides text from PowerPoint OpenXML (<p:sld>, <a:t>)
 */
function extractPptxSlides(slideXmls: string[]): Array<{ title: string; lines: string[] }> {
  return slideXmls.map((xml, idx) => {
    const tRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
    const lines: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = tRegex.exec(xml)) !== null) {
      const clean = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();
      if (clean) lines.push(clean);
    }

    const title = lines.length > 0 ? lines[0] : `Slide ${idx + 1}`;
    const bodyLines = lines.length > 1 ? lines.slice(1) : [];

    return { title, lines: bodyLines };
  });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let curr = '';

  for (const w of words) {
    if ((curr + ' ' + w).trim().length <= maxChars) {
      curr = (curr + ' ' + w).trim();
    } else {
      if (curr) lines.push(curr);
      curr = w;
    }
  }
  if (curr) lines.push(curr);
  return lines;
}

/**
 * Vetted DOCX & PPTX to PDF Converter
 * Strict safeguards: Bounded uncompressed memory, rejects macros, disables XLSX.
 */
export class OfficeConverter {
  public static async convertToPdf(buffer: Buffer): Promise<OfficeConversionResult> {
    try {
      // 1. Validate OpenXML Magic Bytes (PK\x03\x04)
      if (
        buffer.length < 4 ||
        buffer[0] !== 0x50 ||
        buffer[1] !== 0x4b ||
        buffer[2] !== 0x03 ||
        buffer[3] !== 0x04
      ) {
        return {
          success: false,
          errorCode: 'INVALID_OPENXML',
          error: 'File does not contain valid OpenXML archive headers.'
        };
      }

      // 2. Safe Inspection
      const inspection = await inspectAndExtractZip(buffer);

      if (inspection.hasVbaMacro) {
        return {
          success: false,
          errorCode: 'FORBIDDEN_MACRO',
          error: 'FORBIDDEN_MACRO: Macro-enabled office documents (.docm, .pptm, VBA) are prohibited for security.'
        };
      }

      if (inspection.isXlsx) {
        return {
          success: false,
          errorCode: 'XLSX_DISABLED',
          error: 'XLSX_DISABLED: Direct Excel printing is disabled pending print-area testing. Please export sheets to PDF.'
        };
      }

      if (!inspection.isDocx && !inspection.isPptx) {
        return {
          success: false,
          errorCode: 'UNSUPPORTED_OFFICE_FORMAT',
          error: 'Unsupported OpenXML document structure. Please upload a standard .docx or .pptx file.'
        };
      }

      const doc = await PDFDocument.create();
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      const colorBlack = rgb(0.1, 0.12, 0.15);
      const colorGrey = rgb(0.35, 0.4, 0.45);
      const colorEmerald = rgb(0.02, 0.58, 0.41);

      if (inspection.isDocx) {
        // --- DOCX CONVERSION ---
        const docXmlBuffer = inspection.entries.get('word/document.xml');
        if (!docXmlBuffer) {
          return {
            success: false,
            errorCode: 'CONVERSION_FAILED',
            error: 'Missing word/document.xml in DOCX archive.'
          };
        }

        const paragraphs = extractDocxParagraphs(docXmlBuffer.toString('utf8'));
        if (paragraphs.length === 0) {
          paragraphs.push({ text: 'Empty Document', isHeading: false });
        }

        // Standard A4 Portrait: 595.28 x 841.89 pt
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 54; // 0.75 inch
        const contentWidth = pageWidth - margin * 2;
        const charsPerLine = Math.floor(contentWidth / 6.2);

        let currentPage = doc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;

        const checkPage = (needed: number) => {
          if (y - needed < margin) {
            currentPage = doc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        };

        for (const p of paragraphs) {
          if (p.isHeading) {
            checkPage(30);
            y -= 10;
            const headingLines = wrapText(p.text, Math.floor(charsPerLine * 0.8));
            for (const hl of headingLines) {
              checkPage(18);
              currentPage.drawText(hl, {
                x: margin,
                y,
                size: 14,
                font: fontBold,
                color: colorEmerald
              });
              y -= 18;
            }
            y -= 6;
          } else {
            const bodyLines = wrapText(p.text, charsPerLine);
            for (const bl of bodyLines) {
              checkPage(14);
              currentPage.drawText(bl, {
                x: margin,
                y,
                size: 10,
                font: fontRegular,
                color: colorBlack
              });
              y -= 14;
            }
            y -= 6;
          }
        }

        const pdfBytes = await doc.save();
        const pageCount = doc.getPageCount();
        const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');

        return {
          success: true,
          detectedFormat: 'DOCX',
          pdfBytes,
          pageCount,
          sha256
        };
      } else {
        // --- PPTX CONVERSION ---
        const slideKeys = Array.from(inspection.entries.keys())
          .filter((k) => k.startsWith('ppt/slides/slide') && k.endsWith('.xml'))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
            const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
            return numA - numB;
          });

        if (slideKeys.length === 0) {
          return {
            success: false,
            errorCode: 'CONVERSION_FAILED',
            error: 'No slide XML entries found in PowerPoint presentation.'
          };
        }

        const slideXmls = slideKeys.map((k) => inspection.entries.get(k)!.toString('utf8'));
        const slides = extractPptxSlides(slideXmls);

        // Standard A4 Landscape: 841.89 x 595.28 pt
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const margin = 50;

        for (let i = 0; i < slides.length; i++) {
          const s = slides[i];
          const page = doc.addPage([pageWidth, pageHeight]);

          // Slide Header Card
          page.drawRectangle({
            x: margin,
            y: pageHeight - margin - 50,
            width: pageWidth - margin * 2,
            height: 50,
            color: rgb(0.95, 0.97, 0.99)
          });

          page.drawText(s.title || `Slide ${i + 1}`, {
            x: margin + 15,
            y: pageHeight - margin - 32,
            size: 16,
            font: fontBold,
            color: colorEmerald
          });

          let y = pageHeight - margin - 80;
          for (const line of s.lines) {
            if (y < margin + 30) break;
            const wrapped = wrapText(line, 100);
            for (const wl of wrapped) {
              if (y < margin + 30) break;
              page.drawText(`•  ${wl}`, {
                x: margin + 20,
                y,
                size: 11,
                font: fontRegular,
                color: colorBlack
              });
              y -= 16;
            }
            y -= 6;
          }

          // Slide Footer
          page.drawText(`Slide ${i + 1} of ${slides.length}  ·  Shakeel Online Services`, {
            x: margin,
            y: 20,
            size: 8,
            font: fontRegular,
            color: colorGrey
          });
        }

        const pdfBytes = await doc.save();
        const pageCount = doc.getPageCount();
        const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');

        return {
          success: true,
          detectedFormat: 'PPTX',
          pdfBytes,
          pageCount,
          sha256
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown office conversion error.';
      return {
        success: false,
        errorCode: 'CONVERSION_FAILED',
        error: msg
      };
    }
  }
}
