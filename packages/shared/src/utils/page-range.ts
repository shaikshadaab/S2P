export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (totalPages <= 0) return [];

  const trimmed = (rangeStr || '').trim().toLowerCase();
  if (!trimmed || trimmed === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (trimmed === 'odd') {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p % 2 !== 0);
  }

  if (trimmed === 'even') {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p % 2 === 0);
  }

  const pagesSet = new Set<number>();
  const parts = trimmed.split(',');

  for (const part of parts) {
    const segment = part.trim();
    if (!segment) continue;

    if (segment.includes('-')) {
      const [startStr, endStr] = segment.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        throw new Error(`Invalid page range segment: "${segment}"`);
      }

      for (let p = start; p <= end; p++) {
        if (p > totalPages) {
          throw new Error(`Page number ${p} exceeds total document pages (${totalPages})`);
        }
        pagesSet.add(p);
      }
    } else {
      const pageNum = parseInt(segment, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new Error(`Invalid page number: "${segment}"`);
      }
      if (pageNum > totalPages) {
        throw new Error(`Page number ${pageNum} exceeds total document pages (${totalPages})`);
      }
      pagesSet.add(pageNum);
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}

export function formatPageRange(pages: number[]): string {
  if (!pages || pages.length === 0) return 'None';
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);

  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
    } else {
      ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
      rangeStart = current;
      prev = current;
    }
  }
  ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
  return ranges.join(', ');
}
