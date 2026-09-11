import { Text, View } from 'react-native';

export interface AmountDisplayProps {
  /** The big formatted amount, e.g. "$ 1,590.00". */
  display: string;
  /** Optional pending-expression line shown above, e.g. "1,250 +". */
  hint?: string | null;
  /** Flags the amount as invalid (e.g. zero) — renders it in red. */
  invalid?: boolean;
}

/** Large amount readout for the keypad flow. Purely presentational. */
export function AmountDisplay({ display, hint, invalid = false }: AmountDisplayProps) {
  const accent = invalid ? 'bg-danger dark:bg-danger-dark' : 'bg-lime';
  return (
    <View className="items-center gap-1.5">
      {hint ? (
        <Text className="text-[15px] font-semibold text-lime-ink dark:text-lime-ink-dark">
          {hint}
        </Text>
      ) : null}
      <View className="flex-row items-baseline">
        <Text
          className={`text-[52px] font-bold tracking-tight ${
            invalid ? 'text-danger dark:text-danger-dark' : 'text-ink dark:text-ink-dark'
          }`}
        >
          {display}
        </Text>
        <View className={`ml-1 h-11 w-[3px] rounded-sm ${accent}`} />
      </View>
      <View className={`h-[3px] w-36 rounded-sm ${accent}`} />
    </View>
  );
}
