import { useProfile, useUpdateProfile } from '@repo/core/hooks';
import { HOME_LAYOUT_ITEMS, type HomeLayoutItem } from '@repo/core/utils';
import { Button, PageHeader, Screen, ICON_COLORS } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, Switch, Text, View } from 'react-native';

import { WIDGET_META } from '../../../../features/home/widget-catalog';

/**
 * Which of Home's widgets show at all. Where they sit and how big they are
 * is arranged on Home itself (edit mode, "Personalizar"): this screen links
 * there. A widget switched back on lands in the first free spot.
 */
export default function HomeLayoutScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  const hidden = new Set((profile?.home_hidden_items ?? []) as HomeLayoutItem[]);
  const toggle = (key: HomeLayoutItem) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateProfile.mutate({ home_hidden_items: [...next] });
  };

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title="Widgets del inicio" onBack={() => router.back()} />

      <View className="gap-3 rounded-card bg-lime-tint p-4 dark:bg-lime-tint-dark">
        <Text className="text-[13px] leading-[18px] text-ink dark:text-ink-dark">
          Para mover los widgets y cambiar su tamaño, entra a Personalizar en tu inicio. Aquí eliges
          cuáles se muestran.
        </Text>
        <Button
          label="Acomodar en Inicio"
          onPress={() => router.navigate({ pathname: '/(app)', params: { edit: '1' } })}
        />
      </View>

      {isLoading || !profile ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <View className="gap-2.5">
          {HOME_LAYOUT_ITEMS.map((key) => {
            const meta = WIDGET_META[key];
            const off = hidden.has(key);
            return (
              <View
                key={key}
                className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-3 dark:border-line-dark dark:bg-surface-dark"
                style={off ? { opacity: 0.55 } : undefined}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                  <meta.icon size={16} color={ICON_COLORS.limeInk} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[15px] font-medium text-ink dark:text-ink-dark"
                    numberOfLines={1}
                  >
                    {meta.label}
                  </Text>
                  <Text className="text-xs text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
                    {meta.description}
                  </Text>
                </View>
                <Switch
                  value={!off}
                  onValueChange={() => toggle(key)}
                  trackColor={{
                    false: dark ? ICON_COLORS.lineDark : '#E3E5E8',
                    true: ICON_COLORS.lime,
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={dark ? ICON_COLORS.lineDark : '#E3E5E8'}
                />
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
