// Generated from the files in ./locales by scripts/gen-i18n-resources.mjs — don't edit by hand.
import enAccounts from './locales/en/accounts.json';
import enAnalytics from './locales/en/analytics.json';
import enAuth from './locales/en/auth.json';
import enBudgets from './locales/en/budgets.json';
import enCategories from './locales/en/categories.json';
import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enFavorites from './locales/en/favorites.json';
import enGoals from './locales/en/goals.json';
import enHome from './locales/en/home.json';
import enIcons from './locales/en/icons.json';
import enImportExport from './locales/en/importExport.json';
import enLegal from './locales/en/legal.json';
import enNavigation from './locales/en/navigation.json';
import enNotifications from './locales/en/notifications.json';
import enPeers from './locales/en/peers.json';
import enPreferences from './locales/en/preferences.json';
import enProfile from './locales/en/profile.json';
import enSecurity from './locales/en/security.json';
import enSettings from './locales/en/settings.json';
import enTags from './locales/en/tags.json';
import enTour from './locales/en/tour.json';
import enTransactions from './locales/en/transactions.json';
import enValidation from './locales/en/validation.json';
import esAccounts from './locales/es/accounts.json';
import esAnalytics from './locales/es/analytics.json';
import esAuth from './locales/es/auth.json';
import esBudgets from './locales/es/budgets.json';
import esCategories from './locales/es/categories.json';
import esCommon from './locales/es/common.json';
import esErrors from './locales/es/errors.json';
import esFavorites from './locales/es/favorites.json';
import esGoals from './locales/es/goals.json';
import esHome from './locales/es/home.json';
import esIcons from './locales/es/icons.json';
import esImportExport from './locales/es/importExport.json';
import esLegal from './locales/es/legal.json';
import esNavigation from './locales/es/navigation.json';
import esNotifications from './locales/es/notifications.json';
import esPeers from './locales/es/peers.json';
import esPreferences from './locales/es/preferences.json';
import esProfile from './locales/es/profile.json';
import esSecurity from './locales/es/security.json';
import esSettings from './locales/es/settings.json';
import esTags from './locales/es/tags.json';
import esTour from './locales/es/tour.json';
import esTransactions from './locales/es/transactions.json';
import esValidation from './locales/es/validation.json';

/**
 * Every language's texts, one namespace per feature (`locales/<lang>/<feature>.json`).
 * A new feature file goes in both languages, then `pnpm --filter @repo/core gen:i18n`;
 * `satisfies` makes English fail to typecheck if it misses a key Spanish has.
 */
const es = {
  common: esCommon,
  accounts: esAccounts,
  analytics: esAnalytics,
  auth: esAuth,
  budgets: esBudgets,
  categories: esCategories,
  errors: esErrors,
  favorites: esFavorites,
  goals: esGoals,
  home: esHome,
  icons: esIcons,
  importExport: esImportExport,
  legal: esLegal,
  navigation: esNavigation,
  notifications: esNotifications,
  peers: esPeers,
  preferences: esPreferences,
  profile: esProfile,
  security: esSecurity,
  settings: esSettings,
  tags: esTags,
  tour: esTour,
  transactions: esTransactions,
  validation: esValidation,
};

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

const en = {
  common: enCommon,
  accounts: enAccounts,
  analytics: enAnalytics,
  auth: enAuth,
  budgets: enBudgets,
  categories: enCategories,
  errors: enErrors,
  favorites: enFavorites,
  goals: enGoals,
  home: enHome,
  icons: enIcons,
  importExport: enImportExport,
  legal: enLegal,
  navigation: enNavigation,
  notifications: enNotifications,
  peers: enPeers,
  preferences: enPreferences,
  profile: enProfile,
  security: enSecurity,
  settings: enSettings,
  tags: enTags,
  tour: enTour,
  transactions: enTransactions,
  validation: enValidation,
} satisfies Shape<typeof es>;

export const resources = { es, en };
