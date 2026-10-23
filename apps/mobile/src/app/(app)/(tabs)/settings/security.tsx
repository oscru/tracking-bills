import { useSession } from '@repo/core/hooks';
import { Chip, ICON_COLORS, PageHeader, Screen, SwitchRow, useTabBarScrollPadding } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Fingerprint, ScanFace, ShieldAlert, Smartphone } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  authenticate,
  BIOMETRICS_PLATFORM,
  biometricLabel,
  useAppLockSettings,
  useBiometricSupport,
} from '../../../../features/security/biometric';

const TIMEOUTS: { seconds: 0 | 60 | 300 | 900 }[] = [
  { seconds: 0 },
  { seconds: 60 },
  { seconds: 300 },
  { seconds: 900 },
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
  const { t } = useTranslation('security');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { user } = useSession();
  const support = useBiometricSupport();
  const { settings, update } = useAppLockSettings(user?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const label = support?.label ?? biometricLabel('generic');
  const Icon = support?.kind === 'faceId' || support?.kind === 'face' ? ScanFace : Fingerprint;
  const iconColor = dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk;

  // Turning it on proves it works first — never lock someone out with a
  // lock they can't open. Turning it off needs the same proof, so someone
  // holding an unlocked phone can't just switch it off.
  const toggle = async (next: boolean) => {
    setError(null);
    const outcome = await authenticate(
      next ? t('prompt.enable', { method: label }) : t('prompt.disable'),
    );
    if (outcome === 'success') await update({ enabled: next });
    else if (outcome === 'failed') setError(t('verifyFailed'));
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={t('title')} onBack={() => router.back()} />

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
              title={t('mobileOnly')}
              body={t('mobileOnlyHint')}
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
              title={support.needsEnrollment ? t('enroll') : t('noHardware')}
              body={support.needsEnrollment ? t('enrollHint') : t('noHardwareHint')}
            />
          ) : (
            <>
              <View className="items-center gap-3 py-2">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                  <Icon size={30} color={iconColor} />
                </View>
                <Text className="text-center text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
                  {t('intro', { method: label })}
                </Text>
              </View>

              <SwitchRow
                label={t('lockWith', { method: label })}
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
                  {t('relock')}
                </Text>
                <View className="flex-row flex-wrap gap-2 px-1">
                  {TIMEOUTS.map((timeout) => (
                    <Chip
                      key={timeout.seconds}
                      label={t(`timeouts.${timeout.seconds}` as 'timeouts.0')}
                      selected={settings?.timeoutSeconds === timeout.seconds}
                      disabled={!settings?.enabled}
                      onPress={() => {
                        update({ timeoutSeconds: timeout.seconds }).catch(() => {});
                      }}
                    />
                  ))}
                </View>
                <Text className="px-1 text-xs text-ink-3 dark:text-ink-3-dark">
                  {t('relockHint', { method: label })}
                </Text>
              </View>

              <Text className="px-1 text-xs leading-[17px] text-ink-3 dark:text-ink-3-dark">
                {t('deviceOnly')}
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
