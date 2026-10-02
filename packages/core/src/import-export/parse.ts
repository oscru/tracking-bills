import * as XLSX from 'xlsx';

import {
  DEFAULT_IS_COMPLETED,
  FALLBACK_CATEGORY_NAME,
  HEADER_ALIASES,
  PAID_STATUS_VALUES,
  PENDING_STATUS_VALUES,
  type HeaderKey,
} from './constants';
import type { MovementDraft, ParsedWorkbook, RawSheet, RowIssue, TransferDraft } from './types';

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase();
}

/** Maps each recognized header to its column index — order-independent, so a sheet's columns can come in any sequence. */
function mapHeaders(headerRow: unknown[]): Partial<Record<HeaderKey, number>> {
  const map: Partial<Record<HeaderKey, number>> = {};
  const normalized = headerRow.map(normalizeHeader);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [HeaderKey, readonly string[]][]) {
    const index = normalized.findIndex((h) => (aliases as readonly string[]).includes(h));
    if (index !== -1) map[key] = index;
  }
  return map;
}

function cellText(row: unknown[], index: number | undefined): string | null {
  if (index == null) return null;
  const raw = row[index];
  if (raw == null) return null;
  const text = String(raw).trim();
  return text === '' ? null : text;
}

function cellNumber(row: unknown[], index: number | undefined): number | null {
  if (index == null) return null;
  const raw = row[index];
  if (raw == null || raw === '') return null;
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : null;
}

function excelSerialToISO(serial: number): string | null {
  const parsed = XLSX.SSF.parse_date_code(serial) as
    | { y: number; m: number; d: number }
    | undefined;
  if (!parsed) return null;
  return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
}

/** Accepts ISO (`YYYY-MM-DD`, what our own export writes), `DD/MM/YYYY` (what
 * the reference format uses), or a raw Excel date serial — whichever the
 * source file happens to use. Returns `null` when none of those match. */
function parseDate(row: unknown[], index: number | undefined): string | null {
  if (index == null) return null;
  const raw = row[index];
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return excelSerialToISO(raw);

  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  }
  return null;
}

/** A 3-letter code, uppercased — anything else (blank, "US Dollars", a typo)
 * is treated as not specified rather than guessed at. */
function parseCurrencyCode(
  row: unknown[],
  index: number | undefined,
  issues: RowIssue[],
  sheet: string,
  rowNum: number,
): string | null {
  const text = cellText(row, index);
  if (!text) return null;
  const code = text.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    issues.push({
      sheet,
      row: rowNum,
      level: 'warning',
      message: `Divisa "${text}" no reconocida — se ignora para esta fila`,
    });
    return null;
  }
  return code;
}

function parseTagNames(row: unknown[], index: number | undefined): string[] {
  const text = cellText(row, index);
  if (!text) return [];
  return [...new Set(text.split(',').map((t) => t.trim()).filter(Boolean))];
}

function parseIsCompleted(row: unknown[], index: number | undefined, issues: RowIssue[], sheet: string, rowNum: number): boolean {
  const text = cellText(row, index);
  if (!text) return DEFAULT_IS_COMPLETED;
  const normalized = text.toLowerCase();
  if (PAID_STATUS_VALUES.includes(normalized)) return true;
  if (PENDING_STATUS_VALUES.includes(normalized)) return false;
  issues.push({
    sheet,
    row: rowNum,
    level: 'warning',
    message: `Estado "${text}" no reconocido — se marcará como completado`,
  });
  return DEFAULT_IS_COMPLETED;
}

/** Every row that isn't outright empty, with 1-based sheet row numbers preserved for error messages. */
function dataRows(sheet: RawSheet): { row: unknown[]; rowNum: number }[] {
  return sheet.rows
    .slice(1)
    .map((row, i) => ({ row, rowNum: i + 2 }))
    .filter(({ row }) => row.some((c) => c != null && String(c).trim() !== ''));
}

/** Sorted, comma-joined so tag order (which can differ between two sheets
 * listing the same row) doesn't produce a different key. */
function tagsKeyPart(tagNames: string[]): string {
  return [...tagNames].map((t) => t.toLowerCase()).sort().join(',');
}

// Identifies a row as "the same transaction" — used only to collapse an exact
// row that's repeated across a file's redundant sheets (e.g. a combined
// Movements sheet plus derived Expenses/Incomes subsets). Every field the
// source row carries must match, or two real, distinct transactions that
// happen to share date/amount/account/category (e.g. two same-price coffees
// the same day) would silently get merged into one.
function movementKey(m: MovementDraft): string {
  return [
    m.date,
    m.type,
    m.amount,
    m.accountName.toLowerCase(),
    m.categoryName.toLowerCase(),
    (m.subcategoryName ?? '').toLowerCase(),
    (m.description ?? '').toLowerCase(),
    m.currencyCode ?? '',
    m.isCompleted,
    tagsKeyPart(m.tagNames),
  ].join('|');
}

function transferKey(t: TransferDraft): string {
  return [
    t.date,
    t.amount,
    t.fromAccountName.toLowerCase(),
    t.toAccountName.toLowerCase(),
    t.currencyCode ?? '',
    tagsKeyPart(t.tagNames),
  ].join('|');
}

/**
 * Parses every sheet in the workbook into movement/transfer drafts, matching
 * sheets by column shape rather than name or position. A file may contain
 * several sheets shaped like "movements" (e.g. a combined sheet plus
 * redundant Expenses/Incomes subsets, as the reference export tool
 * produces) — rows are de-duplicated by content across all of them instead
 * of trusting any particular sheet to be authoritative.
 */
export function parseWorkbook(sheets: RawSheet[]): ParsedWorkbook {
  const issues: RowIssue[] = [];
  const movementsByKey = new Map<string, MovementDraft>();
  const transfersByKey = new Map<string, TransferDraft>();

  for (const sheet of sheets) {
    const header = sheet.rows[0];
    if (!header) continue;
    const cols = mapHeaders(header);

    const isTransferShape = cols.date != null && cols.value != null && cols.fromAccount != null && cols.toAccount != null;
    const isMovementShape = cols.date != null && cols.value != null && cols.account != null;

    if (isTransferShape) {
      for (const { row, rowNum } of dataRows(sheet)) {
        const date = parseDate(row, cols.date);
        const amount = cellNumber(row, cols.value);
        const fromAccountName = cellText(row, cols.fromAccount);
        const toAccountName = cellText(row, cols.toAccount);

        if (!date && !fromAccountName && !toAccountName) continue;
        if (!date) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'Fecha faltante o inválida' });
          continue;
        }
        if (amount == null || amount <= 0) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'Monto faltante o inválido' });
          continue;
        }
        if (!fromAccountName || !toAccountName) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'Cuenta de origen o destino faltante' });
          continue;
        }
        if (fromAccountName.toLowerCase() === toAccountName.toLowerCase()) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'La cuenta de origen y destino no pueden ser la misma' });
          continue;
        }

        const draft: TransferDraft = {
          sourceSheet: sheet.name,
          sourceRow: rowNum,
          date,
          fromAccountName,
          toAccountName,
          amount,
          currencyCode: parseCurrencyCode(row, cols.currency, issues, sheet.name, rowNum),
          tagNames: parseTagNames(row, cols.tags),
        };
        transfersByKey.set(transferKey(draft), draft);
      }
      continue;
    }

    if (isMovementShape) {
      for (const { row, rowNum } of dataRows(sheet)) {
        const date = parseDate(row, cols.date);
        const rawAmount = cellNumber(row, cols.value);
        const accountName = cellText(row, cols.account);

        // A summary/footer row (e.g. a trailing "Total (expenses)" line) has
        // neither a real date nor an account — worth skipping quietly rather
        // than reporting as a broken data row.
        if (!date && !accountName) continue;
        if (!date) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'Fecha faltante o inválida' });
          continue;
        }
        if (rawAmount == null || rawAmount === 0) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'Valor faltante o inválido' });
          continue;
        }
        if (!accountName) {
          issues.push({ sheet: sheet.name, row: rowNum, level: 'error', message: 'Cuenta faltante' });
          continue;
        }

        let categoryName = cellText(row, cols.category);
        if (!categoryName) {
          issues.push({
            sheet: sheet.name,
            row: rowNum,
            level: 'warning',
            message: `Sin categoría — se asignará "${FALLBACK_CATEGORY_NAME}"`,
          });
          categoryName = FALLBACK_CATEGORY_NAME;
        }

        const draft: MovementDraft = {
          sourceSheet: sheet.name,
          sourceRow: rowNum,
          date,
          description: cellText(row, cols.description),
          amount: Math.abs(rawAmount),
          type: rawAmount < 0 ? 'expense' : 'income',
          accountName,
          currencyCode: parseCurrencyCode(row, cols.currency, issues, sheet.name, rowNum),
          isCompleted: parseIsCompleted(row, cols.status, issues, sheet.name, rowNum),
          categoryName,
          subcategoryName: cellText(row, cols.subcategory),
          tagNames: parseTagNames(row, cols.tags),
        };
        movementsByKey.set(movementKey(draft), draft);
      }
    }
  }

  return {
    movements: [...movementsByKey.values()],
    transfers: [...transfersByKey.values()],
    issues,
  };
}
