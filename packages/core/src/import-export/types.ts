/** One sheet's raw cell grid — row 0 is the header row. */
export interface RawSheet {
  name: string;
  rows: unknown[][];
}

export type RowIssueLevel = 'error' | 'warning';

/**
 * A problem found while parsing one spreadsheet row. `error` rows are
 * dropped from the plan entirely; `warning` rows are still imported, with
 * some value defaulted or coerced (e.g. a blank category becomes "Otro").
 */
export interface RowIssue {
  sheet: string;
  /** 1-based, matching the row number a spreadsheet app would show. */
  row: number;
  level: RowIssueLevel;
  message: string;
}

export interface MovementDraft {
  sourceSheet: string;
  sourceRow: number;
  date: string;
  description: string | null;
  /** Always positive — direction is carried by `type`. */
  amount: number;
  type: 'income' | 'expense';
  accountName: string;
  /** From an optional Currency/Moneda column — `null` when the file doesn't specify one for this row. */
  currencyCode: string | null;
  isCompleted: boolean;
  categoryName: string;
  subcategoryName: string | null;
  tagNames: string[];
}

export interface TransferDraft {
  sourceSheet: string;
  sourceRow: number;
  date: string;
  fromAccountName: string;
  toAccountName: string;
  amount: number;
  /** From an optional Currency/Moneda column — both accounts must end up in this same currency (see `buildImportPlan`). */
  currencyCode: string | null;
  tagNames: string[];
}

export interface ParsedWorkbook {
  movements: MovementDraft[];
  transfers: TransferDraft[];
  issues: RowIssue[];
}
