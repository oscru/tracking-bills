import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-red-500'
    : focused
      ? 'border-neutral-900 dark:border-white'
      : 'border-neutral-200 dark:border-neutral-700';

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#9ca3af"
        className={`h-12 rounded-xl border bg-white px-3 text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 ${borderClass}`}
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
      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
