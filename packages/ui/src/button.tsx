import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'ghost-danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

const container: Record<Variant, string> = {
  primary: 'bg-ink dark:bg-ink-dark',
  secondary: 'bg-[#F1F2F4] dark:bg-line-dark',
  ghost: 'bg-transparent',
  'ghost-danger': 'bg-transparent',
};

const text: Record<Variant, string> = {
  primary: 'text-surface dark:text-surface-dark',
  secondary: 'text-ink dark:text-ink-dark',
  ghost: 'text-lime-ink dark:text-lime-ink-dark',
  'ghost-danger': 'text-danger dark:text-danger-dark',
};

const spinner: Record<Variant, string> = {
  primary: '#fff',
  secondary: '#1A1D21',
  ghost: '#4D7C0F',
  'ghost-danger': '#E5484D',
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      // Dimming on disabled is an inline style, not a conditional `opacity-*`
      // className — toggling that class between renders is a known
      // NativeWind/react-native-css-interop bug that crashes with a bogus
      // "Couldn't find a navigation context" error on native. See:
      // https://github.com/nativewind/nativewind/issues/1536
      style={isDisabled ? { opacity: 0.5 } : undefined}
      className={`h-[52px] flex-row items-center justify-center rounded-ctl px-4 active:opacity-80 ${container[variant]}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinner[variant]} />
      ) : (
        <Text className={`text-base font-semibold ${text[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
