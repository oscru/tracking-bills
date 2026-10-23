import { formatCurrency } from '@repo/core/utils';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { ICON_COLORS } from '@repo/ui';

interface Props {
  saved: number;
  target: number;
  pct: number;
  isComplete: boolean;
  currency: string;
  /** `onDark`: drawn on a `HeroCard` — light text, translucent track. */
  tone?: 'default' | 'onDark';
}

/** A goal's savings progress — lime while in progress, green once the target is reached. */
export function GoalProgressBar({
  saved,
  target,
  pct,
  isComplete,
  currency,
  tone = 'default',
}: Props) {
  const { t } = useTranslation('budgets');
  const { colorScheme } = useColorScheme();
  const onDark = tone === 'onDark';
  const dark = onDark || colorScheme === 'dark';
  const posColor = dark ? ICON_COLORS.posDark : ICON_COLORS.pos;
  const barColor = isComplete ? posColor : ICON_COLORS.lime;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className={`text-sm ${onDark ? 'text-white' : 'text-ink dark:text-ink-dark'}`}>
          {formatCurrency(saved, currency)}{' '}
          <Text className={onDark ? 'text-white/50' : 'text-ink-3 dark:text-ink-3-dark'}>
            {t('progress.of', { amount: formatCurrency(target, currency) })}
          </Text>
        </Text>
        <Text
          className="text-sm font-semibold"
          style={{ color: isComplete ? posColor : onDark ? ICON_COLORS.lime : ICON_COLORS.limeInk }}
        >
          {Math.round(pct)}%
        </Text>
      </View>
      <View
        className={`h-2 overflow-hidden rounded-full ${onDark ? 'bg-white/10' : 'bg-line dark:bg-line-dark'}`}
      >
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: barColor }}
        />
      </View>
    </View>
  );
}
