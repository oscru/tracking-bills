import { formatCurrency } from '@repo/core/utils';
import { useColorScheme } from 'nativewind';
import { Text, View } from 'react-native';

interface Props {
  saved: number;
  target: number;
  pct: number;
  isComplete: boolean;
  currency: string;
}

/** A goal's savings progress — lime while in progress, green once the target is reached. */
export function GoalProgressBar({ saved, target, pct, isComplete, currency }: Props) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const posColor = dark ? '#22C55E' : '#16A34A';
  const barColor = isComplete ? posColor : '#B9F227';

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-ink dark:text-ink-dark">
          {formatCurrency(saved, currency)}{' '}
          <Text className="text-ink-3 dark:text-ink-3-dark">de {formatCurrency(target, currency)}</Text>
        </Text>
        <Text className="text-sm font-semibold" style={{ color: isComplete ? posColor : '#4D7C0F' }}>
          {Math.round(pct)}%
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-line dark:bg-line-dark">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: barColor }}
        />
      </View>
    </View>
  );
}
