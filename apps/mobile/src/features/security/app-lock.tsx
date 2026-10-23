import { i18n } from '@repo/core/i18n';
import { useSession, useSignOut } from '@repo/core/hooks';
import { Button, ICON_COLORS } from '@repo/ui';
import { Fingerprint, ScanFace, Lock } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  authenticate,
  BIOMETRICS_PLATFORM,
  biometricLabel,
  type BiometricKind,
  useAppLockSettings,
  useBiometricSupport,
} from './biometric';

/**
 * Mounted once at the root, above every navigator and bottom-sheet portal:
 * covers the whole app while it's locked. Locks on a cold start and when
 * coming back from the background after the chosen timeout, then asks for
 * Face ID / fingerprint / device PIN on its own.
 */
export function AppLock() {
  const { user } = useSession();
  if (!BIOMETRICS_PLATFORM || !user) return null;
  return <AppLockGate userId={user.id} />;
}

function AppLockGate({ userId }: { userId: string }) {
  const { settings } = useAppLockSettings(userId);
  const support = useBiometricSupport();
  const [locked, setLocked] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [error, setError] = useState<string | null>(null);
  const authenticating = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  // One automatic prompt per lock — after a cancel, the user taps the button.
  const autoPrompted = useRef(false);

  const enabled = settings?.enabled === true;

  // First read of the setting decides the cold-start state; turning the
  // lock off (in Seguridad) unlocks right away.
  const [initialized, setInitialized] = useState(false);
  if (settings && !initialized) {
    setInitialized(true);
    setLocked(settings.enabled);
  } else if (settings && !settings.enabled && locked) {
    setLocked(false);
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppState(next);
      // The system prompt itself (and Android's PIN screen) can push the app
      // to the background — that isn't the user leaving.
      if (authenticating.current) return;
      if (next === 'background') {
        backgroundedAt.current = Date.now();
      } else if (next === 'active' && backgroundedAt.current != null) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabled && away >= (settings?.timeoutSeconds ?? 0) * 1000) {
          autoPrompted.current = false;
          setError(null);
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [enabled, settings?.timeoutSeconds]);

  const label = support?.label ?? biometricLabel('generic');
  // Only refs and state setters inside — stable, so the auto-prompt effect
  // below can depend on it honestly.
  const unlock = useCallback(() => {
    if (authenticating.current) return Promise.resolve();
    authenticating.current = true;
    setError(null);
    // A promise chain rather than try/catch/finally: the React Compiler
    // can't optimize a component containing `finally`.
    return authenticate(i18n.t('security:prompt.unlock'))
      .then((outcome) => {
        if (outcome === 'success') setLocked(false);
        else if (outcome === 'failed') setError(i18n.t('security:verifyFailedRetry'));
      })
      .catch(() => setError(i18n.t('security:verifyFailedRetry')))
      .then(() => {
        authenticating.current = false;
      });
  }, []);

  // Prompt by itself as soon as the lock shows (and the app is in front).
  const showLock = locked && enabled;
  useEffect(() => {
    if (!showLock || appState !== 'active' || autoPrompted.current) return;
    autoPrompted.current = true;
    unlock().catch(() => {});
  }, [showLock, appState, unlock]);

  // Still reading the setting on a cold start: an opaque cover, so a locked
  // app never flashes its data first. Also hides content in the OS app
  // switcher while a locked-enabled app is in the background.
  if (!settings || (enabled && appState !== 'active' && !showLock)) return <Cover />;
  if (!showLock) return null;

  return (
    <LockScreen
      label={label}
      kind={support?.kind ?? 'generic'}
      error={error}
      onUnlock={() => unlock().catch(() => {})}
    />
  );
}

function Cover() {
  return (
    <View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, { zIndex: 10000, elevation: 10000 }]}
      className="bg-canvas dark:bg-canvas-dark"
    />
  );
}

function LockScreen({
  label,
  kind,
  error,
  onUnlock,
}: {
  label: string;
  kind: BiometricKind;
  error: string | null;
  onUnlock: () => void;
}) {
  const { t } = useTranslation('security');
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const signOut = useSignOut();
  const Icon = kind === 'faceId' || kind === 'face' ? ScanFace : Fingerprint;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 24,
          zIndex: 10000,
          elevation: 10000,
        },
      ]}
      className="items-center justify-between bg-canvas px-8 dark:bg-canvas-dark"
    >
      <View />

      <View className="items-center gap-5">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-ink dark:bg-lime">
          <Lock size={34} color={dark ? ICON_COLORS.ink : ICON_COLORS.lime} />
        </View>
        <View className="items-center gap-1.5">
          <Text className="text-[22px] font-bold text-ink dark:text-ink-dark">{t('locked')}</Text>
          <Text className="text-center text-[15px] leading-[21px] text-ink-2 dark:text-ink-2-dark">
            {t('useToSee', { method: label })}
          </Text>
        </View>
        {error ? (
          <Text className="text-center text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : null}
      </View>

      <View className="w-full items-center gap-4">
        <Pressable
          onPress={onUnlock}
          accessibilityRole="button"
          accessibilityLabel={t('unlockWith', { method: label })}
          className="h-16 w-16 items-center justify-center rounded-full bg-lime active:opacity-80"
        >
          <Icon size={30} color={ICON_COLORS.ink} />
        </Pressable>
        <View className="w-full">
          <Button label={t('unlockWith', { method: label })} onPress={onUnlock} />
        </View>
        <Pressable
          onPress={() => signOut.mutate()}
          hitSlop={8}
          accessibilityRole="button"
          className="py-2 active:opacity-60"
        >
          <Text className="text-[14px] font-semibold text-ink-2 dark:text-ink-2-dark">
            {t('signOutPassword')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
