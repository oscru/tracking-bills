import * as XLSX from 'xlsx';

import type { RawSheet } from './types';

/**
 * Reads an .xlsx file's bytes (as base64 — what `expo-file-system` hands
 * back from a picked file) into one raw cell grid per sheet. Pure/sync: no
 * filesystem or network access happens here, so this also runs fine in web.
 */
export function readWorkbookFromBase64(base64: string): RawSheet[] {
  const workbook = XLSX.read(base64, { type: 'base64', cellDates: false });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, {
      header: 1,
      blankrows: false,
      defval: null,
    }),
  }));
}

/** The inverse of `readWorkbookFromBase64` — builds an .xlsx file's bytes (base64) from a set of named sheets, each a header row plus data rows. */
export function writeWorkbookToBase64(sheets: { name: string; rows: unknown[][] }[]): string {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;
}
