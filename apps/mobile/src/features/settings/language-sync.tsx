import { useProfile, useSession } from '@repo/core/hooks';
import { i18n, isLanguage, resolveLanguage, type Language } from '@repo/core/i18n';
import { syncAuthLanguage } from '@repo/core/supabase';
import type { Session } from '@supabase/supabase-js';
import { getLocales } from 'expo-localization';
import { useEffect } from 'react';

/** The device's (or browser's) language if it's one we have — English otherwise. */
export function deviceLanguage(): Language {
  return resolveLanguage(getLocales().map((locale) => locale.languageTag));
}

/**
 * Mounted once at the root, signed in or not (like `ColorSchemeEffects`):
 * the device's language while signed out; once signed in, the profile's
 * (Preferencias › Idioma) — or the device's again when it's on Automático.
 * The profile arrives while the launch splash is still up, so the switch
 * happens before the app is seen. Signed in, the account's language is also
 * copied to the auth user metadata — Supabase's emails are written in it.
 */
export function LanguageEffects() {
  const { session, loading } = useSession();
  if (loading) return null;
  return session ? <ProfileLanguage session={session} /> : <DeviceLanguage />;
}

function DeviceLanguage() {
  useEffect(() => {
    void i18n.changeLanguage(deviceLanguage());
  }, []);
  return null;
}

function ProfileLanguage({ session }: { session: Session }) {
  const { data: profile } = useProfile();
  const loaded = profile !== undefined;
  const chosen = isLanguage(profile?.language) ? profile.language : null;

  useEffect(() => {
    if (!loaded) return;
    const language = chosen ?? deviceLanguage();
    void i18n.changeLanguage(language);
    // Best effort: an email in the previous language until the next launch.
    syncAuthLanguage(session, language).catch(() => {});
  }, [loaded, chosen, session]);

  return null;
}
