export function safeFixed(value: unknown, digits: number = 2, fallback: string = '—'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return num.toFixed(digits);
}

export function formatRupees(amount: unknown, fallback: string = '—'): string {
  const formatted = safeFixed(amount, 2, fallback);
  return formatted === fallback ? fallback : `₹${formatted}`;
}

export function formatPaiseToRupees(paise: unknown, fallback: string = '—'): string {
  if (paise === null || paise === undefined || paise === '') {
    return fallback;
  }
  const num = Number(paise);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return formatRupees(num / 100, fallback);
}

export function formatFileSizeKb(bytes: unknown, fallback: string = '—'): string {
  if (bytes === null || bytes === undefined || bytes === '') {
    return fallback;
  }
  const num = Number(bytes);
  if (!Number.isFinite(num) || num < 0) {
    return fallback;
  }
  return `${(num / 1024).toFixed(0)} KB`;
}

export function formatFileSizeMb(bytes: unknown, fallback: string = '—'): string {
  if (bytes === null || bytes === undefined || bytes === '') {
    return fallback;
  }
  const num = Number(bytes);
  if (!Number.isFinite(num) || num < 0) {
    return fallback;
  }
  return `${(num / 1024 / 1024).toFixed(1)} MB`;
}
