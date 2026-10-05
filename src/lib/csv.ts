import { saveBlob } from './api-client';

type Cell = string | number | boolean | null | undefined;

function escape(v: Cell): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side export of an on-screen selection (opens in Excel). No spreadsheet library needed. */
export function downloadCsv(fileName: string, rows: Cell[][]): void {
  const text = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  // BOM so Excel detects UTF-8 (names with accents).
  saveBlob(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }), fileName);
}
