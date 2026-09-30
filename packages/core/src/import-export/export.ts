import type { Category } from '../types';
import type { TransactionWithRefs } from '../supabase';
import { MOVEMENTS_SHEET_NAME, TRANSFERS_SHEET_NAME } from './constants';
import { writeWorkbookToBase64 } from './workbook';

const MOVEMENT_HEADER = ['Date', 'Description', 'Value', 'Account', 'Status', 'Category', 'Subcategory', 'Tags'];
const TRANSFER_HEADER = ['Date', 'From Account', 'To Account', 'Value', 'Tags'];

function movementRow(
  tx: TransactionWithRefs,
  categoryById: Map<string, Category>,
): unknown[] {
  const category = tx.category;
  const isSub = category?.parent_id != null;
  const parentName = isSub ? categoryById.get(category!.parent_id!)?.name ?? category!.name : (category?.name ?? '');
  const subName = isSub ? category!.name : '';
  const signedAmount = tx.type === 'expense' ? -Number(tx.amount) : Number(tx.amount);

  return [
    tx.transaction_date,
    tx.description ?? '',
    signedAmount,
    tx.account?.name ?? '',
    tx.is_completed ? 'Paid' : 'Pending',
    parentName,
    subName,
    tx.tags.map((t) => t.name).join(', '),
  ];
}

function transferRow(tx: TransactionWithRefs): unknown[] {
  // The reference format has no concept of a savings goal as a transfer
  // destination, so a goal-bound transfer is written with a labeled
  // placeholder rather than silently dropped — it won't round-trip as a
  // goal contribution on re-import, but the record itself isn't lost.
  const toName = tx.to_account?.name ?? (tx.goal ? `Objetivo: ${tx.goal.name}` : '');
  return [tx.transaction_date, tx.account?.name ?? '', toName, Number(tx.amount), tx.tags.map((t) => t.name).join(', ')];
}

/**
 * Builds the export workbook (base64 .xlsx bytes) from already-loaded data.
 * Mirrors the reference format's 4-sheet shape — a combined movements sheet
 * plus redundant Expenses/Incomes subsets, and a separate Transfers sheet —
 * so a file this app exports opens the same way in the tool the format
 * originally came from. `transactions` is expected pre-sorted (the default
 * `listTransactions` order — newest first) since this doesn't re-sort them.
 */
export function buildExportWorkbookBase64(data: {
  transactions: TransactionWithRefs[];
  categories: Category[];
}): string {
  const categoryById = new Map(data.categories.map((c) => [c.id, c]));

  const movements = data.transactions.filter((t) => t.type !== 'transfer');
  const transfers = data.transactions.filter((t) => t.type === 'transfer');

  const movementRows = movements.map((t) => movementRow(t, categoryById));
  const expenseRows = movements.filter((t) => t.type === 'expense').map((t) => movementRow(t, categoryById));
  const incomeRows = movements.filter((t) => t.type === 'income').map((t) => movementRow(t, categoryById));
  const transferRows = transfers.map(transferRow);

  return writeWorkbookToBase64([
    { name: MOVEMENTS_SHEET_NAME, rows: [MOVEMENT_HEADER, ...movementRows] },
    { name: 'Expenses', rows: [MOVEMENT_HEADER, ...expenseRows] },
    { name: 'Incomes', rows: [MOVEMENT_HEADER, ...incomeRows] },
    { name: TRANSFERS_SHEET_NAME, rows: [TRANSFER_HEADER, ...transferRows] },
  ]);
}
