import { i18n, initI18n } from '@repo/core/i18n';
import { Platform } from 'react-native';

import { deviceLanguage } from './features/settings/language-sync';

// Translations ready before anything renders — in the device's (or browser's)
// language; the signed-in profile's choice takes over in `LanguageEffects`.
initI18n(deviceLanguage());

// Web: screen readers, the browser's translate offer and hyphenation read <html lang>.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const setLang = (language: string) => (document.documentElement.lang = language);
  setLang(i18n.language);
  i18n.on('languageChanged', setLang);
}
