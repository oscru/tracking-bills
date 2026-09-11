import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-danger dark:border-danger-dark'
    : focused
      ? 'border-2 border-ink dark:border-ink-dark'
      : 'border border-line dark:border-line-dark';

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#9CA3AF"
        className={`h-[52px] rounded-ctl bg-surface px-3.5 text-base text-ink dark:bg-surface-dark dark:text-ink-dark ${borderClass}`}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
    </View>
  );
}
