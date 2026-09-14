import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@repo/ui';
import { Pressable, ScrollView, Text, View } from 'react-native';

export interface MultiSelectOption {
  value: string;
  label: string;
  dotColor?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-[6px] border-2 ${
        checked ? 'border-lime bg-lime' : 'border-line dark:border-line-dark'
      }`}
    >
      {checked ? <Ionicons name="checkmark" size={14} color="#1A1D21" /> : null}
    </View>
  );
}

/** Reusable multi-select list sheet: "Seleccionar todo" + a checkbox per option. */
export function MultiSelectSheet({ visible, onClose, title, options, values, onChange }: Props) {
  const allSelected = options.length > 0 && values.length === options.length;

  const toggleAll = () => {
    onChange(allSelected ? [] : options.map((o) => o.value));
  };
  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      headerAction={
        <Pressable onPress={onClose} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            Listo
          </Text>
        </Pressable>
      }
    >
      <ScrollView className="max-h-[480px]" contentContainerClassName="pb-4">
        <Pressable
          onPress={toggleAll}
          className="min-h-[56px] flex-row items-center gap-3 border-t border-line px-5 dark:border-line-dark"
        >
          <Checkbox checked={allSelected} />
          <Text className="flex-1 text-[15px] font-bold text-ink dark:text-ink-dark">
            Seleccionar todo
          </Text>
        </Pressable>

        {options.map((opt) => {
          const checked = values.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
              className="min-h-[56px] flex-row items-center gap-3 border-t border-line px-5 dark:border-line-dark"
            >
              <Checkbox checked={checked} />
              {opt.dotColor ? (
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: opt.dotColor }}
                />
              ) : null}
              <Text className="flex-1 text-[15px] text-ink dark:text-ink-dark">{opt.label}</Text>
            </Pressable>
          );
        })}

        {options.length === 0 ? (
          <Text className="px-5 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
            No hay opciones todavía.
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
