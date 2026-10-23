import { BottomSheet, IconButton } from '@repo/ui';
import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export interface RecordInfoRow {
  label: string;
  value: string;
}

/**
 * The (i) button in a record's header (cuenta, categoría, tag) and the
 * sheet it opens — a dialog on desktop: the record's facts that don't
 * belong on the screen itself (when it was created, last changed,
 * archived…). Rows with an empty value are left out.
 */
export function RecordInfoButton({ title, rows }: { title: string; rows: RecordInfoRow[] }) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const shown = rows.filter((r) => r.value !== '');
  return (
    <>
      <IconButton icon={Info} onPress={() => setOpen(true)} accessibilityLabel={t('info.title')} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={title}>
        <View className="mx-5 mb-4 rounded-2xl border border-line px-4 dark:border-line-dark">
          {shown.map((row, i) => (
            <View key={row.label}>
              {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
              <View className="flex-row items-center justify-between gap-4 py-3.5">
                <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{row.label}</Text>
                <Text className="flex-shrink text-right text-sm font-semibold text-ink dark:text-ink-dark">
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}
