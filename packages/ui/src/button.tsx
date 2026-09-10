import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

const container: Record<Variant, string> = {
  primary: 'bg-neutral-900 dark:bg-white',
  secondary: 'bg-neutral-100 dark:bg-neutral-800',
  ghost: 'bg-transparent',
};

const text: Record<Variant, string> = {
  primary: 'text-white dark:text-neutral-900',
  secondary: 'text-neutral-900 dark:text-neutral-50',
  ghost: 'text-neutral-900 dark:text-neutral-50',
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
      className={`h-12 flex-row items-center justify-center rounded-xl px-4 ${container[variant]} ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      }`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#111'} />
      ) : (
        <Text className={`text-base font-semibold ${text[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
