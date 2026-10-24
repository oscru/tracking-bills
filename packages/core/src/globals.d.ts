/**
 * Minimal ambient declaration for the env vars Metro/Babel inline at build time.
 * Only `EXPO_PUBLIC_*` values are exposed to the client bundle.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    /** The landing site (legal documents). */
    EXPO_PUBLIC_SITE_URL?: string;
    [key: string]: string | undefined;
  };
};
