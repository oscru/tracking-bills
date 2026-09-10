/**
 * Minimal ambient declaration for the env vars Metro/Babel inline at build time.
 * Only `EXPO_PUBLIC_*` values are exposed to the client bundle.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    [key: string]: string | undefined;
  };
};
