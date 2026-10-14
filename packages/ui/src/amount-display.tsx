import { Text, View } from 'react-native';

export interface AmountDisplayProps {
  /** The big formatted amount, e.g. "$ 1,590.00". */
  display: string;
  /** Optional pending-expression line shown above, e.g. "1,250 +". */
  hint?: string | null;
  /** Flags the amount as invalid (e.g. zero) — renders it in red. */
  invalid?: boolean;
  /** `onDark`: sits on a `HeroCard` — light text, lime accents. */
  tone?: 'default' | 'onDark';
}

/** Large amount readout for the keypad flow. Purely presentational. */
export function AmountDisplay({
  display,
  hint,
  invalid = false,
  tone = 'default',
}: AmountDisplayProps) {
  const onDark = tone === 'onDark';
  const accent = invalid ? 'bg-danger dark:bg-danger-dark' : 'bg-lime';
  const amountColor = invalid
    ? onDark
      ? 'text-danger-dark'
      : 'text-danger dark:text-danger-dark'
    : onDark
      ? 'text-white'
      : 'text-ink dark:text-ink-dark';
  return (
    <View className="items-center gap-1.5">
      {hint ? (
        <Text
          className={`text-[15px] font-semibold ${
            onDark ? 'text-lime' : 'text-lime-ink dark:text-lime-ink-dark'
          }`}
        >
          {hint}
        </Text>
      ) : null}
      <Text className={`text-[52px] font-bold tracking-tight ${amountColor}`}>{display}</Text>
      <View className={`h-[3px] w-36 rounded-sm ${accent}`} />
    </View>
  );
}
