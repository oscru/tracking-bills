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
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  if (permission.state === 'granted') return null;

  if (permission.state === 'unsupported') {
    return (
      <View className="flex-row gap-3 rounded-2xl bg-surface p-4 dark:bg-surface-dark">
        <Smartphone size={20} color={dark ? ICON_COLORS.ink2Dark : ICON_COLORS.ink2} />
        <Text className="flex-1 text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
          {DEVICE_NOTIFICATIONS_NEED_DEV_BUILD
            ? 'Expo Go para Android ya no incluye notificaciones. Funcionan al correr la app como build de desarrollo (npx expo run:android). Tu centro de notificaciones funciona aquí igual.'
            : 'Los avisos en el teléfono llegan desde la app de iOS y Android. Tu centro de notificaciones funciona aquí igual.'}
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
            {blocked ? 'Las notificaciones están bloqueadas' : 'Activa las notificaciones'}
          </Text>
          <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
            {blocked
              ? 'Permítelas desde los ajustes del teléfono para recibir tus recordatorios.'
              : 'Para avisarte de pagos pendientes, presupuestos y metas aunque no tengas la app abierta.'}
          </Text>
        </View>
      </View>
      <Button
        label={blocked ? 'Abrir ajustes' : 'Permitir notificaciones'}
        onPress={() => {
          if (blocked) Linking.openSettings().catch(() => {});
          else permission.request().catch(() => {});
        }}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
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
      <PageHeader title="Notificaciones" onBack={() => router.back()} />

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
            label="Recibir notificaciones"
            description="En el teléfono. Tu centro de notificaciones siempre muestra todo."
            value={prefs.enabled}
            onValueChange={(v) => set('enabled', v)}
          />

          <Section title="Pagos pendientes">
            <SwitchRow
              label="El día del pago"
              value={prefs.pendingToday}
              onValueChange={(v) => set('pendingToday', v)}
              disabled={off}
            />
            <SwitchRow
              label="Un día antes"
              value={prefs.pendingTomorrow}
              onValueChange={(v) => set('pendingTomorrow', v)}
              disabled={off}
            />
            <SwitchRow
              label="Si siguen pendientes"
              description="Hasta 3 recordatorios, cada 3 días."
              value={prefs.pendingOverdue}
              onValueChange={(v) => set('pendingOverdue', v)}
              disabled={off}
            />
          </Section>

          <Section title="Presupuestos">
            <SwitchRow
              label="Avisos de presupuesto"
              description="Cuando te acercas al límite y cuando te pasas."
              value={prefs.budgets}
              onValueChange={(v) => set('budgets', v)}
              disabled={off}
            />
            <View className="gap-2 px-1 pt-1">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                Avisarme al llegar al
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {BUDGET_THRESHOLDS.map((t) => (
                  <Chip
                    key={t}
                    label={`${t}%`}
                    selected={prefs.budgetThreshold === t}
                    onPress={() => set('budgetThreshold', t)}
                  />
                ))}
              </View>
            </View>
          </Section>

          <Section title="Metas de ahorro">
            <SwitchRow
              label="Recordatorios de aportación"
              description="Cuando toca aportar según tu plan, o si vas atrasado."
              value={prefs.goalReminders}
              onValueChange={(v) => set('goalReminders', v)}
              disabled={off}
            />
            <SwitchRow
              label="Logros"
              description="Al llegar al 25, 50 y 75%, y al completar una meta."
              value={prefs.goalAchievements}
              onValueChange={(v) => set('goalAchievements', v)}
              disabled={off}
            />
          </Section>

          <Section title="Hora de los recordatorios">
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
              label={testSent ? 'Prueba enviada' : 'Enviar notificación de prueba'}
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
