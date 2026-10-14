import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { GradientFill } from './gradient';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

// Matches the `rounded-ctl` radius in the preset — the gradient is drawn,
// not a background color, so it needs the number.
const CONTROL_RADIUS = 14;

const container: Record<Variant, string> = {
  // Drawn by `GradientFill` (the lime "action" gradient) — no flat background.
  primary: 'bg-transparent',
  secondary: 'bg-[#F1F2F4] dark:bg-line-dark',
  danger: 'bg-danger dark:bg-danger-dark',
  ghost: 'bg-transparent',
  'ghost-danger': 'bg-transparent',
};

const text: Record<Variant, string> = {
  primary: 'text-ink',
  secondary: 'text-ink dark:text-ink-dark',
  danger: 'text-white',
  ghost: 'text-lime-ink dark:text-lime-ink-dark',
  'ghost-danger': 'text-danger dark:text-danger-dark',
};

const spinner: Record<Variant, string> = {
  primary: '#1A1D21',
  secondary: '#1A1D21',
  danger: '#fff',
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
      {variant === 'primary' ? <GradientFill radius={CONTROL_RADIUS} /> : null}
      {loading ? (
        <ActivityIndicator color={spinner[variant]} />
      ) : (
        <Text
          className={`text-base ${variant === 'primary' ? 'font-bold' : 'font-semibold'} ${text[variant]}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
