import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  /** Tint the border red without an inline message — for when a summary error (e.g. an `ErrorCard`) already names this field. */
  invalid?: boolean;
  /** Rendered inside the field, right-aligned — e.g. a show/hide password toggle. */
  rightElement?: React.ReactNode;
  /** Rendered inside the field, left of the text — e.g. a field icon. */
  leftElement?: React.ReactNode;
  ref?: React.Ref<TextInput>;
}

export function TextField({
  label,
  error,
  invalid,
  rightElement,
  leftElement,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass =
    error || invalid
      ? 'border-danger dark:border-danger-dark'
      : focused
        ? 'border-2 border-ink dark:border-ink-dark'
        : 'border border-line dark:border-line-dark';

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{label}</Text>
      ) : null}
      <View
        className={`h-[52px] flex-row items-center rounded-ctl bg-surface dark:bg-surface-dark ${borderClass}`}
      >
        {leftElement ? <View className="pl-3.5">{leftElement}</View> : null}
        <TextInput
          placeholderTextColor="#9CA3AF"
          className={`flex-1 ${leftElement ? 'pl-2.5 pr-3.5' : 'px-3.5'} text-base text-ink dark:text-ink-dark`}
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
        {rightElement ? <View className="pr-3.5">{rightElement}</View> : null}
      </View>
      {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
    </View>
  );
}
