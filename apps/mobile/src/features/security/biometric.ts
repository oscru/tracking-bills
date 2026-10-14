import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Biometric app lock: Face ID / fingerprint / the device's own PIN, asked
 * before showing any data. It doesn't replace the Supabase session — that
 * stays signed in exactly as before; this only gates the UI on top of it.
 *
 * The on/off choice lives in the device keychain (`expo-secure-store`), not
 * in the user's profile: whether *this phone* has a fingerprint enrolled is
 * a per-device fact, and a shared setting would lock you out of a device
 * that has none.
 */
export const BIOMETRICS_PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android';

export interface BiometricSupport {
  /** Hardware present and at least one fingerprint/face enrolled. */
  available: boolean;
  /** Hardware present but nothing enrolled — the user has to set it up in the phone's settings first. */
  needsEnrollment: boolean;
  /** How to call it in the UI: "Face ID", "huella", … */
  label: string;
}

const UNSUPPORTED: BiometricSupport = {
  available: false,
  needsEnrollment: false,
  label: 'biometría',
};

async function readSupport(): Promise<BiometricSupport> {
  if (!BIOMETRICS_PLATFORM) return UNSUPPORTED;
  const [hasHardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const label =
    Platform.OS === 'ios' && face
      ? 'Face ID'
      : Platform.OS === 'ios' && finger
        ? 'Touch ID'
        : finger
          ? 'huella'
          : face
            ? 'reconocimiento facial'
            : 'biometría';
  return { available: hasHardware && enrolled, needsEnrollment: hasHardware && !enrolled, label };
}

export function useBiometricSupport(): BiometricSupport | null {
  const [support, setSupport] = useState<BiometricSupport | null>(null);
  useEffect(() => {
    let alive = true;
    readSupport()
      .then((s) => alive && setSupport(s))
      .catch(() => alive && setSupport(UNSUPPORTED));
    return () => {
      alive = false;
    };
  }, []);
  return support;
}

export type AuthOutcome = 'success' | 'cancelled' | 'failed';

/**
 * Shows the system prompt. Falls back to the device PIN/pattern/passcode if
 * biometrics fail or are locked out — the same unlock the phone itself uses.
 */
export async function authenticate(promptMessage: string): Promise<AuthOutcome> {
  if (!BIOMETRICS_PLATFORM) return 'failed';
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancelar',
    fallbackLabel: 'Usar código',
    disableDeviceFallback: false,
  });
  if (result.success) return 'success';
  return result.error === 'user_cancel' ||
    result.error === 'system_cancel' ||
    result.error === 'app_cancel'
    ? 'cancelled'
    : 'failed';
}

// --- the per-device setting ---------------------------------------------------------------

export interface AppLockSettings {
  enabled: boolean;
  /** How long the app may sit in the background before it locks again. 0 = right away. */
  timeoutSeconds: number;
}

export const DEFAULT_APP_LOCK: AppLockSettings = { enabled: false, timeoutSeconds: 0 };

// SecureStore keys allow only [A-Za-z0-9._-].
const storageKey = (userId: string) => `appLock.${userId.replace(/[^A-Za-z0-9._-]/g, '')}`;

export async function readAppLockSettings(userId: string): Promise<AppLockSettings> {
  if (!BIOMETRICS_PLATFORM) return DEFAULT_APP_LOCK;
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return DEFAULT_APP_LOCK;
  try {
    const parsed = JSON.parse(raw) as Partial<AppLockSettings>;
    return {
      enabled: parsed.enabled === true,
      timeoutSeconds:
        typeof parsed.timeoutSeconds === 'number' && parsed.timeoutSeconds >= 0
          ? parsed.timeoutSeconds
          : 0,
    };
  } catch {
    return DEFAULT_APP_LOCK;
  }
}

async function writeAppLockSettings(userId: string, settings: AppLockSettings) {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(settings));
}

// Every `useAppLockSettings` (the lock overlay and the settings screen) sees
// a change made by any other one immediately.
type Listener = (userId: string, settings: AppLockSettings) => void;
const listeners = new Set<Listener>();

/** The signed-in user's lock setting on this device; `null` until read. */
export function useAppLockSettings(userId: string | null) {
  // Tagged with the user it belongs to, so switching accounts reads as
  // "not loaded yet" instead of briefly showing the previous user's setting.
  const [loaded, setLoaded] = useState<{ userId: string; settings: AppLockSettings } | null>(null);
  const settings = userId && loaded?.userId === userId ? loaded.settings : null;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    readAppLockSettings(userId)
      .then((s) => alive && setLoaded({ userId, settings: s }))
      .catch(() => alive && setLoaded({ userId, settings: DEFAULT_APP_LOCK }));
    const listener: Listener = (id, next) => id === userId && setLoaded({ userId, settings: next });
    listeners.add(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, [userId]);

  const update = useCallback(
    async (patch: Partial<AppLockSettings>) => {
      if (!userId) return;
      const next = { ...(settings ?? DEFAULT_APP_LOCK), ...patch };
      await writeAppLockSettings(userId, next);
      listeners.forEach((l) => l(userId, next));
    },
    [userId, settings],
  );

  return { settings, update };
}
