import { Pressable, Text, View } from 'react-native';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Matches Tailwind's `shadow-sm`. Applied via inline `style` (not a conditional
// `shadow-sm` className) — toggling `shadow-*` classes on/off between renders is
// a known NativeWind/react-native-css-interop bug that crashes with a bogus
// "Couldn't find a navigation context" error on native. See:
// https://github.com/nativewind/nativewind/issues/1536
const activeShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-1 rounded-ctl bg-[#EEF0F2] p-1 dark:bg-line-dark">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={active ? activeShadow : undefined}
            className={`h-10 flex-1 items-center justify-center rounded-[9px] ${
              active ? 'bg-surface dark:bg-surface-dark' : ''
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                active ? 'text-ink dark:text-ink-dark' : 'text-ink-2 dark:text-ink-2-dark'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
