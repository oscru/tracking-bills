import { Ionicons } from '@expo/vector-icons';
import { useProfile, useUpdateProfile } from '@repo/core/hooks';
import type { ThemePreference } from '@repo/core/types';
import { findCurrency, type CurrencyMeta } from '@repo/core/utils';
import { BottomSheet, PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CurrencyPicker } from '../../../../features/settings/currency-picker';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title="Preferencias" onBack={() => router.back()} />

      {isLoading || !profile ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <>
          <CurrencySection currency={profile.currency} />
          <ThemeSection value={profile.theme_preference} />

          <View className="gap-2 rounded-2xl border border-line px-4 py-4 dark:border-line-dark">
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">Idioma</Text>
            <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
              Por ahora la app solo está disponible en español.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

function CurrencySection({ currency }: { currency: string }) {
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = findCurrency(currency);

  const pick = (c: CurrencyMeta) => {
    if (c.code !== currency) updateProfile.mutate({ currency: c.code });
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Moneda</Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Text className="text-[15px] font-medium capitalize text-ink dark:text-ink-dark">
          {meta ? `${meta.symbol} · ${meta.name} (${meta.code})` : currency}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>
      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        Se usa como moneda por defecto cuando una cuenta no define la suya.
      </Text>

      <CurrencyPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedCode={currency}
        onSelect={pick}
      />
    </View>
  );
}

function ThemeSection({ value }: { value: ThemePreference }) {
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = THEME_OPTIONS.find((o) => o.value === value) ?? THEME_OPTIONS[0]!;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tema</Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <View className="flex-row items-center gap-2.5">
          <Ionicons name={selected.icon} size={18} color="#4D7C0F" />
          <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
            {selected.label}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Tema">
        <View className="pb-4">
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                updateProfile.mutate({ theme_preference: opt.value });
                setPickerOpen(false);
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                <Ionicons name={opt.icon} size={16} color="#4D7C0F" />
              </View>
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {opt.label}
              </Text>
              {value === opt.value ? (
                <Ionicons name="checkmark" size={18} color="#4D7C0F" />
              ) : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
