/**
 * Column headers we recognize, by semantic key. Import matches sheets by
 * header shape (not by sheet name or column order), case-insensitively —
 * so a file exported by another app with equivalent columns in a different
 * language or order still imports. `fromAccount`/`toAccount` include the
 * Portuguese "Conta origem"/"Conta destino" because that's what the
 * reference format (and at least one real-world export tool) uses for the
 * transfers sheet specifically.
 */
export const HEADER_ALIASES = {
  date: ['date', 'fecha'],
  description: ['description', 'descripción', 'descripcion'],
  value: ['value', 'amount', 'monto', 'valor'],
  account: ['account', 'cuenta'],
  status: ['status', 'estado'],
  category: ['category', 'categoría', 'categoria'],
  subcategory: [
    'subcategory',
    'sub-category',
    'sub category',
    'subcategoría',
    'subcategoria',
  ],
  tags: ['tags', 'tag', 'etiquetas'],
  fromAccount: [
    'conta origem',
    'from account',
    'source account',
    'account (from)',
    'cuenta origen',
  ],
  toAccount: [
    'conta destino',
    'to account',
    'destination account',
    'account (to)',
    'cuenta destino',
  ],
} as const;

export type HeaderKey = keyof typeof HEADER_ALIASES;

/** Values in the Status column that mean "settled" — anything else (including blank) is treated per `DEFAULT_IS_COMPLETED`. */
export const PAID_STATUS_VALUES = ['paid', 'pagado', 'completado', 'completo', 'liquidado'];
/** Values that explicitly mean "not settled yet". */
export const PENDING_STATUS_VALUES = ['pending', 'pendiente', 'scheduled', 'programado', 'agendado'];

export const DEFAULT_IS_COMPLETED = true;

/** What a blank Category cell falls back to — matches the seeded starter category. */
export const FALLBACK_CATEGORY_NAME = 'Otro';

/** Type + defaults given to an account auto-created during import. */
export const AUTO_ACCOUNT_TYPE = 'debit' as const;

/** Color given to a category/subcategory auto-created during import — same neutral tone as the seeded "Otro" category. */
export const AUTO_CATEGORY_COLOR = '#94a3b8';

export const MOVEMENTS_SHEET_NAME = 'Transactions';
export const TRANSFERS_SHEET_NAME = 'Transfers';
