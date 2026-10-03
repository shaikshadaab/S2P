import { parsePageRange } from "../utils/page-range";
import { ColorMode, PaperSize } from "../types";

export interface PrintMetricsInput {
  totalPagesInDocument: number;
  pageRangeText?: string;
  colorMode?: ColorMode;
  paperSize?: PaperSize;
  isDuplex?: boolean;
  pagesPerSheet?: 1 | 2 | 4;
  copies?: number;
}

export interface PrintMetricsResult {
  selectedPageCount: number;
  selectedPages: number[];
  pagesPerSheet: number;
  printableSides: number;
  physicalSheets: number;
  copies: number;
}

/**
 * Pure calculation of physical sheets and printable sides for free print jobs.
 */
export function calculatePrintMetrics(input: PrintMetricsInput): PrintMetricsResult {
  const {
    totalPagesInDocument,
    pageRangeText = "all",
    isDuplex = false,
    pagesPerSheet = 1,
    copies = 1,
  } = input;

  if (copies < 1) {
    throw new Error("Number of copies must be at least 1");
  }

  const selectedPages = parsePageRange(pageRangeText, totalPagesInDocument);
  const selectedPageCount = selectedPages.length;

  if (selectedPageCount === 0) {
    throw new Error("No pages selected for printing");
  }

  const validPagesPerSheet = [1, 2, 4].includes(pagesPerSheet) ? pagesPerSheet : 1;
  const printableSides = Math.ceil(selectedPageCount / validPagesPerSheet);
  const physicalSheetsPerCopy = isDuplex ? Math.ceil(printableSides / 2) : printableSides;
  const totalPhysicalSheets = physicalSheetsPerCopy * copies;

  return {
    selectedPageCount,
    selectedPages,
    pagesPerSheet: validPagesPerSheet,
    printableSides,
    physicalSheets: totalPhysicalSheets,
    copies,
  };
}
