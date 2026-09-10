import { Pressable, View } from 'react-native';

export const CATEGORY_COLORS = [
  '#22c55e',
  '#16a34a',
  '#0d9488',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#2563eb',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f472b6',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#ca8a04',
  '#64748b',
] as const;

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {CATEGORY_COLORS.map((c) => {
        const selected = value.toLowerCase() === c;
        return (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(c)}
            className={`h-8 w-8 items-center justify-center rounded-full ${
              selected ? 'border-2 border-neutral-900 dark:border-white' : ''
            }`}
          >
            <View className="h-6 w-6 rounded-full" style={{ backgroundColor: c }} />
          </Pressable>
        );
      })}
    </View>
  );
}
