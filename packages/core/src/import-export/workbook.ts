import type { RawSheet } from './types';

// `xlsx` (~0.85 MB) is loaded on demand: only importing or exporting a file
// needs it, so it stays out of the app's main bundle (on web, `import()`
// becomes its own chunk, downloaded the first time it's used).
const loadXlsx = () => import('xlsx');

/**
 * Reads an .xlsx file's bytes (as base64 — what `expo-file-system` hands
 * back from a picked file) into one raw cell grid per sheet. Pure/sync: no
 * filesystem or network access happens here, so this also runs fine in web.
 */
export async function readWorkbookFromBase64(base64: string): Promise<RawSheet[]> {
  const XLSX = await loadXlsx();
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
export async function writeWorkbookToBase64(
  sheets: { name: string; rows: unknown[][] }[],
): Promise<string> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;
}
