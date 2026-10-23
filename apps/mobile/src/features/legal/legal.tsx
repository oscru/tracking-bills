import { LEGAL_PATHS, type LegalDocument } from '@repo/core/utils';
import { ICON_COLORS } from '@repo/ui';
import * as WebBrowser from 'expo-web-browser';
import { Check } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

/**
 * The legal documents live on the public landing site (App Store, Google
 * Play and Google/Apple sign-in all need public URLs) — the app links there.
 */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://genobills.vercel.app').replace(
  /\/$/,
  '',
);

export const LEGAL_LABELS: Record<LegalDocument, string> = {
  terms: 'Términos y condiciones',
  privacy: 'Aviso de privacidad',
  cookies: 'Política de cookies',
};

export function legalUrl(doc: LegalDocument): string {
  return `${SITE_URL}${LEGAL_PATHS[doc]}`;
}

/** Opens a document: a new tab on web, the in-app browser on phones. */
export function openLegal(doc: LegalDocument) {
  const url = legalUrl(doc);
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

/** An inline link to a document, inside a sentence — underlined, in the text's ink (lime is for the screen's main action). */
export function LegalLink({ doc, children }: { doc: LegalDocument; children?: ReactNode }) {
  return (
    <Text
      accessibilityRole="link"
      onPress={() => openLegal(doc)}
      className="font-medium text-ink underline dark:text-ink-dark"
    >
      {children ?? LEGAL_LABELS[doc]}
    </Text>
  );
}

/**
 * The consent checkbox for creating an account (or accepting a new version
 * of the documents): Términos y condiciones + Aviso de privacidad, and the
 * age statement — 18+, or 13–17 with a parent's or guardian's consent.
 */
export function LegalConsent({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <View className="gap-1.5">
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        // The links inside are separate elements; screen readers need the
        // whole sentence here.
        accessibilityLabel="Acepto los Términos y condiciones y el Aviso de privacidad. Tengo 18 años o más, o tengo entre 13 y 17 y cuento con el consentimiento de mi madre, padre o tutor."
        hitSlop={4}
        className="flex-row items-start gap-3"
      >
        <View
          className={`mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-[7px] border-2 ${
            checked
              ? 'border-ink bg-ink dark:border-lime dark:bg-lime'
              : error
                ? 'border-danger dark:border-danger-dark'
                : 'border-line dark:border-line-dark'
          }`}
        >
          {checked ? (
            <Check size={14} color={dark ? ICON_COLORS.ink : ICON_COLORS.lime} strokeWidth={3} />
          ) : null}
        </View>
        <Text className="flex-1 text-[13px] leading-5 text-ink-2 dark:text-ink-2-dark">
          Acepto los <LegalLink doc="terms" /> y el <LegalLink doc="privacy" />. Tengo 18 años o
          más, o tengo entre 13 y 17 y cuento con el consentimiento de mi madre, padre o tutor.
        </Text>
      </Pressable>
      {error ? (
        <Text className="pl-[34px] text-sm text-danger dark:text-danger-dark">{error}</Text>
      ) : null}
    </View>
  );
}

/** Under the Google/Apple buttons: signing in with them also means accepting. */
export function SsoLegalNotice() {
  return (
    <Text className="text-center text-[11px] leading-4 text-ink-3 dark:text-ink-3-dark">
      Al continuar aceptas los <LegalLink doc="terms">Términos</LegalLink> y el{' '}
      <LegalLink doc="privacy">Aviso de privacidad</LegalLink>.
    </Text>
  );
}
