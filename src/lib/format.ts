/** Display formatting (UK conventions, matching the prototype). */

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** '2026-03-31' → '31 Mar 2026'; null → '-'. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function formatShortDate(iso: string): string {
  return shortFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

/** 1.5 → '1.5 h'; 2 → '2 h'. */
export function formatHours(h: number): string {
  return `${Number.isInteger(h) ? h : Number(h.toFixed(2))} h`;
}

export function formatPct(p: number): string {
  return `${Math.round(p)}%`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-03' → 'Mar'. */
export function monthLabel(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1] ?? month;
}
