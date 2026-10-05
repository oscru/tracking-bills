/** Which illustration (from `@repo/ui`'s `*EmptyIllustration` set) each
 * welcome-carousel slide reuses — kept as a key (not a component reference)
 * so this file stays plain data with no React/JSX dependency. */
export type WelcomeSlideIllustrationKey =
  | 'accounts'
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'goals'
  | 'tags';

export interface WelcomeSlideContent {
  illustrationKey: WelcomeSlideIllustrationKey;
  title: string;
  description: string;
}

/** Narrative order: set up an account, register movements, organize them by
 * category, control spend with a budget, save toward a goal — tags last, as
 * the optional/bonus organizing tool. */
export const WELCOME_SLIDES_CONTENT: WelcomeSlideContent[] = [
  {
    illustrationKey: 'accounts',
    title: 'Tus cuentas',
    description: 'Registra tus cuentas de banco, efectivo o tarjetas para llevar el control de tu dinero.',
  },
  {
    illustrationKey: 'transactions',
    title: 'Tus movimientos',
    description: 'Anota cada gasto o ingreso en segundos y mira tu historial completo en un solo lugar.',
  },
  {
    illustrationKey: 'categories',
    title: 'Categorías',
    description: 'Clasifica tus movimientos para entender en qué se va realmente tu dinero.',
  },
  {
    illustrationKey: 'budgets',
    title: 'Presupuestos',
    description: 'Ponle un límite a tu gasto por categoría y te avisamos cuando te estés acercando.',
  },
  {
    illustrationKey: 'goals',
    title: 'Metas',
    description: 'Define cuánto quieres ahorrar y para cuándo, y sigue tu progreso en tiempo real.',
  },
  {
    illustrationKey: 'tags',
    title: 'Tags',
    description: 'Agrupa movimientos entre categorías — perfecto para un viaje o un proyecto puntual.',
  },
];
