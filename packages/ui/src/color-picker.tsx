import { Pressable, View } from 'react-native';

export interface ColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string) => void;
  colors: readonly string[];
}

export function ColorPicker({ value, onChange, colors }: ColorPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {colors.map((c) => {
        const selected = value?.toLowerCase() === c;
        return (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(c)}
            className={`h-8 w-8 items-center justify-center rounded-full ${
              selected ? 'border-2 border-ink dark:border-ink-dark' : ''
            }`}
          >
            <View className="h-6 w-6 rounded-full" style={{ backgroundColor: c }} />
          </Pressable>
        );
      })}
    </View>
  );
}
