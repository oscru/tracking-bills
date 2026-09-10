import { Pressable, Text, View, type PressableProps } from 'react-native';

export interface ChipProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  selected?: boolean;
  /** Optional leading color dot (e.g. a category color). */
  dotColor?: string | null;
}

export function Chip({ label, selected = false, dotColor, ...props }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
        selected
          ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white'
          : 'border-neutral-200 bg-transparent dark:border-neutral-700'
      }`}
      {...props}
    >
      {dotColor ? (
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
      ) : null}
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-white dark:text-neutral-900' : 'text-neutral-700 dark:text-neutral-300'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
