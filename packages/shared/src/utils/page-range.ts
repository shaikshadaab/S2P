/**
 * Parses and validates customer page selection strings like:
 * - "all"
 * - "odd"
 * - "even"
 * - "1-5"
 * - "1,3,5"
 * - "1-3, 5, 8-10"
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (totalPages <= 0) {
    throw new Error("Total pages in document must be greater than 0");
  }

  const clean = (rangeStr || "all").trim().toLowerCase();

  if (clean === "all" || clean === "") {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (clean === "odd") {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i += 2) {
      pages.push(i);
    }
    return pages;
  }

  if (clean === "even") {
    const pages: number[] = [];
    for (let i = 2; i <= totalPages; i += 2) {
      pages.push(i);
    }
    if (pages.length === 0) {
      throw new Error("No even pages available in a 1-page document");
    }
    return pages;
  }

  const pageSet = new Set<number>();
  const tokens = clean.split(",");

  for (const token of tokens) {
    const part = token.trim();
    if (!part) continue;

    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range format: "${part}"`);
      }

      if (start <= 0 || end <= 0) {
        throw new Error(`Page numbers must be 1 or greater in range "${part}"`);
      }

      if (start > end) {
        throw new Error(`Range start cannot be greater than range end: "${part}"`);
      }

      if (start > totalPages || end > totalPages) {
        throw new Error(`Selected page ${Math.max(start, end)} exceeds total pages (${totalPages})`);
      }

      for (let p = start; p <= end; p++) {
        pageSet.add(p);
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: "${part}"`);
      }
      if (page <= 0) {
        throw new Error(`Page numbers must be 1 or greater`);
      }
      if (page > totalPages) {
        throw new Error(`Selected page ${page} exceeds total pages (${totalPages})`);
      }
      pageSet.add(page);
    }
  }

  const sorted = Array.from(pageSet).sort((a, b) => a - b);
  if (sorted.length === 0) {
    throw new Error("No valid pages selected");
  }

  return sorted;
}

/**
 * Formats an array of sorted pages into concise range notation.
 * e.g. [1, 2, 3, 5, 8, 9, 10] => "1-3, 5, 8-10"
 */
export function formatPageRange(pages: number[]): string {
  if (!pages || pages.length === 0) return "";
  const sorted = [...new Set(pages)].sort((a, b) => a - b);

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(", ");
}
