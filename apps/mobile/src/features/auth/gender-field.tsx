import { translateMessage } from '@repo/core/i18n';
import type { Gender } from '@repo/core/types';
import { BottomSheet, ICON_COLORS } from '@repo/ui';
import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

const OPTIONS: Gender[] = ['female', 'male', 'other', 'prefer_not_to_say'];

interface GenderFieldProps {
  label?: string;
  value: Gender | null;
  onChange: (value: Gender) => void;
  error?: string;
}

export function GenderField({ label, value, onChange, error }: GenderFieldProps) {
  const { t } = useTranslation('profile');
  const title = label ?? t('gender');
  const [open, setOpen] = useState(false);
  const selected = OPTIONS.find((o) => o === value);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{title}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className={`h-[52px] flex-row items-center justify-between rounded-ctl border bg-surface px-3.5 dark:bg-surface-dark ${
          error ? 'border-danger dark:border-danger-dark' : 'border-line dark:border-line-dark'
        }`}
      >
        <Text
          className={`text-base ${selected ? 'text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'}`}
        >
          {selected ? t(`genders.${selected}`) : t('pickOption')}
        </Text>
        <ChevronDown size={18} color={ICON_COLORS.ink3} />
      </Pressable>
      {error ? (
        <Text className="text-xs text-danger dark:text-danger-dark">{translateMessage(error)}</Text>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={title}>
        <View className="pb-4">
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {t(`genders.${opt}`)}
              </Text>
              {value === opt ? <Check size={18} color={ICON_COLORS.limeInk} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
