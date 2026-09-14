import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@repo/ui';
import { Pressable, Text, View } from 'react-native';

export interface FilterOption {
  value: string;
  label: string;
  dotColor?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Label for the "no filter" row, e.g. "Todas las cuentas". */
  allLabel: string;
  options: FilterOption[];
  value: string | null;
  onSelect: (value: string | null) => void;
}

/** Reusable single-select list sheet: "<allLabel>" + one row per option, checkmark on the pick. */
export function FilterOptionSheet({
  visible,
  onClose,
  title,
  allLabel,
  options,
  value,
  onSelect,
}: Props) {
  const pick = (v: string | null) => {
    onSelect(v);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View className="pb-4">
        <Pressable
          onPress={() => pick(null)}
          className="flex-row items-center justify-between border-t border-line px-5 py-3 dark:border-line-dark"
        >
          <Text className="text-[15px] text-ink-2 dark:text-ink-2-dark">{allLabel}</Text>
          {value === null ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
        </Pressable>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => pick(opt.value)}
            className="flex-row items-center gap-3 border-t border-line px-5 py-3 dark:border-line-dark"
          >
            {opt.dotColor ? (
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: opt.dotColor }}
              />
            ) : null}
            <Text className="flex-1 text-[15px] font-bold text-ink dark:text-ink-dark">
              {opt.label}
            </Text>
            {value === opt.value ? <Ionicons name="checkmark" size={18} color="#4D7C0F" /> : null}
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
