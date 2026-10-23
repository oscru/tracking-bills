import { currentLanguage, translateMessage } from '@repo/core/i18n';
import { LEGAL_PATHS, type LegalDocument } from '@repo/core/utils';
import { ICON_COLORS } from '@repo/ui';
import * as WebBrowser from 'expo-web-browser';
import { Check } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';

/**
 * The legal documents live on the public landing site (App Store, Google
 * Play and Google/Apple sign-in all need public URLs) — the app links there.
 */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://genobills.vercel.app').replace(
  /\/$/,
  '',
);

/** The document in the app's language. */
export function legalUrl(doc: LegalDocument): string {
  return `${SITE_URL}${LEGAL_PATHS[currentLanguage()][doc]}`;
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
  const { t } = useTranslation('legal');
  return (
    <Text
      accessibilityRole="link"
      onPress={() => openLegal(doc)}
      className="font-medium text-ink underline dark:text-ink-dark"
    >
      {children ?? t(`documents.${doc}`)}
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
  const { t } = useTranslation('legal');
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <View className="gap-1.5">
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        // The links inside are separate elements; screen readers need the
        // whole sentence here.
        accessibilityLabel={t('consentA11y')}
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
          <Trans
            t={t}
            i18nKey="consent"
            components={{ terms: <LegalLink doc="terms" />, privacy: <LegalLink doc="privacy" /> }}
          />
        </Text>
      </Pressable>
      {error ? (
        <Text className="pl-[34px] text-sm text-danger dark:text-danger-dark">
          {translateMessage(error)}
        </Text>
      ) : null}
    </View>
  );
}

/** Under the Google/Apple buttons: signing in with them also means accepting. */
export function SsoLegalNotice() {
  return (
    <Text className="text-center text-[11px] leading-4 text-ink-3 dark:text-ink-3-dark">
      <Trans
        ns="legal"
        i18nKey="ssoNotice"
        components={{ terms: <LegalLink doc="terms" />, privacy: <LegalLink doc="privacy" /> }}
      />
    </Text>
  );
}
