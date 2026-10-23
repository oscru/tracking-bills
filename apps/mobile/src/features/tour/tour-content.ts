/** Which illustration (from `@repo/ui`'s `*EmptyIllustration` set) each
 * welcome-carousel slide reuses — kept as a key (not a component reference)
 * so this file stays plain data with no React/JSX dependency. */
export type WelcomeSlideIllustrationKey =
  'accounts' | 'transactions' | 'categories' | 'budgets' | 'goals' | 'tags';

/** Narrative order: set up an account, register movements, organize them by
 * category, control spend with a budget, save toward a goal — tags last, as
 * the optional/bonus organizing tool. Each slide's text: `tour:slides.<key>`. */
export const WELCOME_SLIDES: WelcomeSlideIllustrationKey[] = [
  'accounts',
  'transactions',
  'categories',
  'budgets',
  'goals',
  'tags',
];
