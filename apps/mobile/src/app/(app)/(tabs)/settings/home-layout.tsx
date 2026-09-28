import { Ionicons } from '@expo/vector-icons';
import { useProfile, useUpdateProfile } from '@repo/core/hooks';
import { normalizeHomeLayout, type HomeLayoutItem } from '@repo/core/utils';
import { PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View, useColorScheme } from 'react-native';

const ITEM_META: Record<
  HomeLayoutItem,
  { label: string; description: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: 'Movimientos pendientes',
    description: 'Aviso de gastos o ingresos que ya deberían haberse realizado',
    icon: 'time-outline',
  },
  upcoming: {
    label: 'Movimientos próximos',
    description: 'Recordatorio de lo que tienes programado a futuro',
    icon: 'calendar-outline',
  },
  monthlyTotals: {
    label: 'Ingresos y gastos del mes',
    description: 'Totales del mes en dos tarjetas',
    icon: 'swap-vertical-outline',
  },
  categorySpend: {
    label: 'Gastos por categoría',
    description: 'Gráfica y tus 5 categorías con más gasto',
    icon: 'pie-chart-outline',
  },
  accounts: {
    label: 'Tus cuentas',
    description: 'Lista de cuentas y su saldo',
    icon: 'wallet-outline',
  },
};

/** Lets the user reorder Home's optional cards. The balance card and month
 * selector aren't included — they're the screen's anchor and always come first. */
export default function HomeLayoutScreen() {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const order: HomeLayoutItem[] = normalizeHomeLayout(profile?.home_layout);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    updateProfile.mutate({ home_layout: next });
  };

  const arrowColor = (enabled: boolean) => (enabled ? (dark ? '#F2F3F5' : '#1A1D21') : '#D1D5DB');

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title="Orden del inicio" onBack={() => router.back()} />

      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        Cambia el orden de las tarjetas de tu pantalla principal. El balance total y el
        selector de mes siempre se quedan fijos arriba.
      </Text>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <View className="rounded-card border border-line dark:border-line-dark">
          {order.map((key, i) => {
            const meta = ITEM_META[key];
            return (
              <View key={key}>
                {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                <View className="flex-row items-center gap-3 px-4 py-3.5">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                    <Ionicons name={meta.icon} size={16} color="#4D7C0F" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
                      {meta.label}
                    </Text>
                    <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                      {meta.description}
                    </Text>
                  </View>
                  <View className="gap-1.5">
                    <Pressable
                      disabled={i === 0}
                      onPress={() => move(i, -1)}
                      hitSlop={6}
                      accessibilityLabel={`Subir ${meta.label}`}
                    >
                      <Ionicons name="chevron-up" size={18} color={arrowColor(i > 0)} />
                    </Pressable>
                    <Pressable
                      disabled={i === order.length - 1}
                      onPress={() => move(i, 1)}
                      hitSlop={6}
                      accessibilityLabel={`Bajar ${meta.label}`}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={arrowColor(i < order.length - 1)}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
