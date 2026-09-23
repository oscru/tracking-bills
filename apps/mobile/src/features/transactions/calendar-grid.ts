/** Shared month-grid math for the movement-entry date field and the filter date range field. */

export const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const WEEKS_PER_GRID = 6;

/**
 * Mon-first 6x7 grid of the given month; `null` cells pad the leading/trailing
 * days. Always 6 rows — a 4- or 5-week month is padded with trailing blank
 * rows too, so the grid is the same height every month and the sheet (and
 * anything below it) doesn't jump when navigating between months.
 */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length < WEEKS_PER_GRID * 7) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
