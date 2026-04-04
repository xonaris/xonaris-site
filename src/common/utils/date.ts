/**
 * Date formatting utilities — always display in UTC to avoid local-timezone drift.
 * All functions return '—' for null/undefined inputs.
 */

const LOCALE = 'fr-FR';
const TZ = { timeZone: 'Europe/Brussels' } as const;

type DateInput = string | Date | null | undefined;

function d(input: DateInput): Date | null {
  if (!input) return null;
  const date = new Date(input as string | Date);
  return isNaN(date.getTime()) ? null : date;
}

/** 29/03/2026 */
export function fmtDate(input: DateInput): string {
  const date = d(input);
  return date ? date.toLocaleDateString(LOCALE, TZ) : '—';
}

/** 29/03/2026 17:54:17 */
export function fmtDateTime(input: DateInput): string {
  const date = d(input);
  return date ? date.toLocaleString(LOCALE, TZ) : '—';
}

/** 29 mars 2026 */
export function fmtDateLong(input: DateInput): string {
  const date = d(input);
  return date
    ? date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', ...TZ })
    : '—';
}

/** 29 mars 2026, 17:54 */
export function fmtDateTimeLong(input: DateInput): string {
  const date = d(input);
  return date
    ? date.toLocaleDateString(LOCALE, {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', ...TZ,
      })
    : '—';
}

/** 29 mars 2026, 17:54 (short month) */
export function fmtDateTimeShort(input: DateInput): string {
  const date = d(input);
  return date
    ? date.toLocaleDateString(LOCALE, {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...TZ,
      })
    : '—';
}

/** 29 mars 2026 (short month) */
export function fmtDateShort(input: DateInput): string {
  const date = d(input);
  return date
    ? date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', ...TZ })
    : '—';
}

/** 29/03 — for chart tick labels */
export function fmtDayMonth(input: DateInput): string {
  const date = d(input);
  return date
    ? date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', ...TZ })
    : '—';
}

/** 29 — for chart day-only tick labels */
export function fmtDay(input: DateInput): string {
  const date = d(input);
  return date ? date.toLocaleDateString(LOCALE, { day: '2-digit', ...TZ }) : '—';
}
