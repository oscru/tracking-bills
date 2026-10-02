import { Ionicons } from '@expo/vector-icons';
import type { Gender } from '@repo/core/types';
import { BottomSheet, ICON_COLORS } from '@repo/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

const OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
];

interface GenderFieldProps {
  label?: string;
  value: Gender | null;
  onChange: (value: Gender) => void;
  error?: string;
}

export function GenderField({ label = 'Género', value, onChange, error }: GenderFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = OPTIONS.find((o) => o.value === value);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className={`h-[52px] flex-row items-center justify-between rounded-ctl border bg-surface px-3.5 dark:bg-surface-dark ${
          error ? 'border-danger dark:border-danger-dark' : 'border-line dark:border-line-dark'
        }`}
      >
        <Text
          className={`text-base ${selected ? 'text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'}`}
        >
          {selected?.label ?? 'Selecciona una opción'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={ICON_COLORS.ink3} />
      </Pressable>
      {error ? <Text className="text-xs text-danger dark:text-danger-dark">{error}</Text> : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View className="pb-4">
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {opt.label}
              </Text>
              {value === opt.value ? (
                <Ionicons name="checkmark" size={18} color={ICON_COLORS.limeInk} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
