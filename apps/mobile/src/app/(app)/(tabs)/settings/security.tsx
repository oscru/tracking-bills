import { useSession } from '@repo/core/hooks';
import { Chip, ICON_COLORS, PageHeader, Screen, SwitchRow, useTabBarScrollPadding } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Fingerprint, ScanFace, ShieldAlert, Smartphone } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  authenticate,
  BIOMETRICS_PLATFORM,
  useAppLockSettings,
  useBiometricSupport,
} from '../../../../features/security/biometric';

const TIMEOUTS: { seconds: number; label: string }[] = [
  { seconds: 0, label: 'Al salir' },
  { seconds: 60, label: '1 min' },
  { seconds: 300, label: '5 min' },
  { seconds: 900, label: '15 min' },
];

function InfoCard({
  icon,
  title,
  body,
  tone = 'neutral',
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <View
      className={`flex-row gap-3 rounded-2xl p-4 ${
        tone === 'warning'
          ? 'bg-warning-tint dark:bg-warning-tint-dark'
          : 'bg-surface dark:bg-surface-dark'
      }`}
    >
      {icon}
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{title}</Text>
        <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">{body}</Text>
      </View>
    </View>
  );
}

export default function SecuritySettingsScreen() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { user } = useSession();
  const support = useBiometricSupport();
  const { settings, update } = useAppLockSettings(user?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const label = support?.label ?? 'biometría';
  const Icon = label === 'Face ID' || label === 'reconocimiento facial' ? ScanFace : Fingerprint;
  const iconColor = dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk;

  // Turning it on proves it works first — never lock someone out with a
  // lock they can't open. Turning it off needs the same proof, so someone
  // holding an unlocked phone can't just switch it off.
  const toggle = async (next: boolean) => {
    setError(null);
    const outcome = await authenticate(
      next
        ? `Confirma para activar el bloqueo con ${label}`
        : 'Confirma para desactivar el bloqueo',
    );
    if (outcome === 'success') await update({ enabled: next });
    else if (outcome === 'failed') setError('No pudimos verificar tu identidad.');
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title="Seguridad" onBack={() => router.back()} />

      {!support || (BIOMETRICS_PLATFORM && !settings) ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          {!BIOMETRICS_PLATFORM ? (
            <InfoCard
              icon={<Smartphone size={20} color={dark ? ICON_COLORS.ink2Dark : ICON_COLORS.ink2} />}
              title="Disponible en la app móvil"
              body="El bloqueo con huella o Face ID se activa desde la app de iOS o Android."
            />
          ) : !support.available ? (
            <InfoCard
              tone="warning"
              icon={
                <ShieldAlert
                  size={20}
                  color={dark ? ICON_COLORS.warningDark : ICON_COLORS.warning}
                />
              }
              title={
                support.needsEnrollment
                  ? 'Configura tu huella o rostro'
                  : 'Tu teléfono no tiene biometría'
              }
              body={
                support.needsEnrollment
                  ? 'Registra una huella o tu rostro en los ajustes del teléfono para poder usarlos aquí.'
                  : 'Este dispositivo no tiene lector de huella ni reconocimiento facial.'
              }
            />
          ) : (
            <>
              <View className="items-center gap-3 py-2">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                  <Icon size={30} color={iconColor} />
                </View>
                <Text className="text-center text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
                  Pide tu {label} al abrir la app, para que nadie más vea tus saldos y movimientos.
                  Si falla, puedes usar el código de tu teléfono.
                </Text>
              </View>

              <SwitchRow
                label={`Bloquear con ${label}`}
                value={settings?.enabled === true}
                onValueChange={(v) => {
                  toggle(v).catch(() => {});
                }}
              />
              {error ? (
                <Text className="px-1 text-sm text-danger dark:text-danger-dark">{error}</Text>
              ) : null}

              <View className="gap-2" style={settings?.enabled ? undefined : { opacity: 0.5 }}>
                <Text className="px-1 text-[13px] font-bold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
                  Volver a bloquear
                </Text>
                <View className="flex-row flex-wrap gap-2 px-1">
                  {TIMEOUTS.map((t) => (
                    <Chip
                      key={t.seconds}
                      label={t.label}
                      selected={settings?.timeoutSeconds === t.seconds}
                      disabled={!settings?.enabled}
                      onPress={() => {
                        update({ timeoutSeconds: t.seconds }).catch(() => {});
                      }}
                    />
                  ))}
                </View>
                <Text className="px-1 text-xs text-ink-3 dark:text-ink-3-dark">
                  Tiempo que la app puede estar en segundo plano antes de pedirte tu {label} otra
                  vez.
                </Text>
              </View>

              <Text className="px-1 text-xs leading-[17px] text-ink-3 dark:text-ink-3-dark">
                Esta opción se guarda solo en este dispositivo.
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
