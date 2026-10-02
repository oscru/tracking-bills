import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface CurrencyFieldProps extends Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'keyboardType'
> {
  label?: string;
  /** Plain numeric string, e.g. "1500.5" — no symbol, no thousands separators. Same shape `TextField`'s decimal-pad amount fields already use. */
  value: string;
  onChangeText: (value: string) => void;
  /** ISO 4217 code, e.g. "MXN". */
  currency?: string;
  locale?: string;
  error?: string | null;
  /** Tint the border red without an inline message — for when a summary error (e.g. an `ErrorCard`) already names this field. */
  invalid?: boolean;
}

/** `currency` may be in-progress user input (e.g. an account's currency code
 * field, typed character by character) — `Intl` throws on anything that
 * isn't a complete, valid ISO 4217 code, so an incomplete one falls back to "$"
 * rather than crashing the field while the user is still typing it. */
function currencySymbol(currency: string, locale: string): string {
  try {
    const part = new Intl.NumberFormat(locale, { style: 'currency', currency })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? '$';
  } catch {
    return '$';
  }
}

/** Strips everything but digits and a single decimal point — what the field
 * actually stores/reports, regardless of how the user's keystroke landed. */
function toRawNumeric(text: string): string {
  const digitsAndDots = text.replace(/[^\d.]/g, '');
  const firstDot = digitsAndDots.indexOf('.');
  if (firstDot === -1) return digitsAndDots;
  return (
    digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, '')
  );
}

/** Adds the currency symbol and thousands separators for display, preserving
 * an in-progress decimal (e.g. "1500." while the user is still typing). */
function toDisplay(raw: string, symbol: string, locale: string): string {
  if (raw === '') return '';
  const [intPart, decPart] = raw.split('.');
  const groupedInt = (intPart || '0').replace(/^0+(?=\d)/, '');
  const grouped = Number(groupedInt || '0').toLocaleString(locale);
  return decPart !== undefined ? `${symbol}${grouped}.${decPart}` : `${symbol}${grouped}`;
}

/**
 * A currency-aware amount field: shows the symbol and thousands separators
 * live as the user types, but reports (and accepts) a plain numeric string —
 * a drop-in replacement for `TextField` on any amount input.
 */
export function CurrencyField({
  label,
  value,
  onChangeText,
  currency = 'MXN',
  locale = 'es-MX',
  error,
  invalid,
  onFocus,
  onBlur,
  ...props
}: CurrencyFieldProps) {
  const [focused, setFocused] = useState(false);
  const symbol = currencySymbol(currency, locale);

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
      <TextInput
        value={toDisplay(value, symbol, locale)}
        onChangeText={(text) => onChangeText(toRawNumeric(text))}
        keyboardType="decimal-pad"
        placeholder={`${symbol}0.00`}
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
