import { useProfile, useUpdateProfile } from '@repo/core/hooks';
import { parseNotificationPrefs, type NotificationPrefs } from '@repo/core/notifications';
import {
  Button,
  Chip,
  ICON_COLORS,
  PageHeader,
  Screen,
  SwitchRow,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { BellRing, BellOff, Smartphone } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';

import {
  DEVICE_NOTIFICATIONS_NEED_DEV_BUILD,
  sendTestNotification,
  useNotificationPermission,
  type NotificationPermission,
} from '../../../../features/notifications/device';

const REMINDER_HOURS = [7, 8, 9, 12, 18, 20, 21];
const BUDGET_THRESHOLDS = [50, 70, 80, 90];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-bold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
        {title}
      </Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

/** Where the OS permission stands, and the one action that moves it forward. */
function PermissionCard({ permission }: { permission: NotificationPermission }) {
  const { t } = useTranslation('notifications');
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  if (permission.state === 'granted') return null;

  if (permission.state === 'unsupported') {
    return (
      <View className="flex-row gap-3 rounded-2xl bg-surface p-4 dark:bg-surface-dark">
        <Smartphone size={20} color={dark ? ICON_COLORS.ink2Dark : ICON_COLORS.ink2} />
        <Text className="flex-1 text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
          {DEVICE_NOTIFICATIONS_NEED_DEV_BUILD ? t('settings.devBuild') : t('settings.webOnly')}
        </Text>
      </View>
    );
  }

  const blocked = permission.state === 'denied' && !permission.canAskAgain;
  return (
    <View
      className={`gap-3 rounded-2xl p-4 ${
        blocked
          ? 'bg-warning-tint dark:bg-warning-tint-dark'
          : 'bg-lime-tint dark:bg-lime-tint-dark'
      }`}
    >
      <View className="flex-row gap-3">
        {blocked ? (
          <BellOff size={22} color={dark ? ICON_COLORS.warningDark : ICON_COLORS.warning} />
        ) : (
          <BellRing size={22} color={dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk} />
        )}
        <View className="flex-1 gap-0.5">
          <Text
            className={`text-[15px] font-bold ${
              blocked
                ? 'text-warning dark:text-warning-dark'
                : 'text-lime-ink dark:text-lime-ink-dark'
            }`}
          >
            {t(blocked ? 'settings.blocked' : 'settings.enable')}
          </Text>
          <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
            {blocked ? t('settings.blockedHint') : t('settings.enableHint')}
          </Text>
        </View>
      </View>
      <Button
        label={t(blocked ? 'settings.openSettings' : 'settings.allow')}
        onPress={() => {
          if (blocked) Linking.openSettings().catch(() => {});
          else permission.request().catch(() => {});
        }}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation('notifications');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const permission = useNotificationPermission();
  const [testSent, setTestSent] = useState(false);

  const prefs = parseNotificationPrefs(profile?.notification_prefs);
  const set = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) =>
    updateProfile.mutate({ notification_prefs: { ...prefs, [key]: value } });
  const off = !prefs.enabled;

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={t('settings.title')} onBack={() => router.back()} />

      {isLoading || !profile ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          <PermissionCard permission={permission} />

          <SwitchRow
            label={t('settings.receive')}
            description={t('settings.receiveHint')}
            value={prefs.enabled}
            onValueChange={(v) => set('enabled', v)}
          />

          <Section title={t('settings.pending')}>
            <SwitchRow
              label={t('settings.pendingToday')}
              value={prefs.pendingToday}
              onValueChange={(v) => set('pendingToday', v)}
              disabled={off}
            />
            <SwitchRow
              label={t('settings.pendingTomorrow')}
              value={prefs.pendingTomorrow}
              onValueChange={(v) => set('pendingTomorrow', v)}
              disabled={off}
            />
            <SwitchRow
              label={t('settings.pendingOverdue')}
              description={t('settings.pendingOverdueHint')}
              value={prefs.pendingOverdue}
              onValueChange={(v) => set('pendingOverdue', v)}
              disabled={off}
            />
          </Section>

          <Section title={t('settings.budgets')}>
            <SwitchRow
              label={t('settings.budgetAlerts')}
              description={t('settings.budgetAlertsHint')}
              value={prefs.budgets}
              onValueChange={(v) => set('budgets', v)}
              disabled={off}
            />
            <View className="gap-2 px-1 pt-1">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                {t('settings.budgetThreshold')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {BUDGET_THRESHOLDS.map((threshold) => (
                  <Chip
                    key={threshold}
                    label={`${threshold}%`}
                    selected={prefs.budgetThreshold === threshold}
                    onPress={() => set('budgetThreshold', threshold)}
                  />
                ))}
              </View>
            </View>
          </Section>

          <Section title={t('settings.goals')}>
            <SwitchRow
              label={t('settings.goalReminders')}
              description={t('settings.goalRemindersHint')}
              value={prefs.goalReminders}
              onValueChange={(v) => set('goalReminders', v)}
              disabled={off}
            />
            <SwitchRow
              label={t('settings.milestones')}
              description={t('settings.milestonesHint')}
              value={prefs.goalAchievements}
              onValueChange={(v) => set('goalAchievements', v)}
              disabled={off}
            />
          </Section>

          <Section title={t('settings.peers')}>
            <SwitchRow
              label={t('settings.peerTransfers')}
              description={t('settings.peerTransfersHint')}
              value={prefs.peerTransfers}
              onValueChange={(v) => set('peerTransfers', v)}
              disabled={off}
            />
          </Section>

          <Section title={t('settings.hour')}>
            <View
              className="flex-row flex-wrap gap-2 px-1"
              style={off ? { opacity: 0.5 } : undefined}
            >
              {REMINDER_HOURS.map((h) => (
                <Chip
                  key={h}
                  label={`${h}:00`}
                  selected={prefs.reminderHour === h}
                  disabled={off}
                  onPress={() => set('reminderHour', h)}
                />
              ))}
            </View>
          </Section>

          {permission.state === 'granted' && prefs.enabled ? (
            <Button
              label={t(testSent ? 'settings.testSent' : 'settings.sendTest')}
              variant="secondary"
              onPress={() => {
                sendTestNotification()
                  .then(() => setTestSent(true))
                  .catch(() => {});
              }}
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}
