import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

function StatCard() {
  return (
    <View className="flex-1 gap-2 rounded-2xl border border-line p-4 dark:border-line-dark">
      <Skeleton width={60} height={11} />
      <Skeleton width={30} height={26} radius={6} />
      <Skeleton width={70} height={11} />
    </View>
  );
}

function SwitchRowSkeleton() {
  return (
    <View className="flex-row items-center justify-between rounded-ctl border border-line px-3.5 py-3 dark:border-line-dark">
      <View className="flex-1 gap-1.5 pr-3">
        <Skeleton width={140} height={15} />
        <Skeleton width={200} height={11} />
      </View>
      <Skeleton width={44} height={26} radius={13} />
    </View>
  );
}

/** Placeholder shown while an account's own detail is still loading —
 * mirrors the balance card, the "Ajustar saldo" button, the income/expense
 * stat cards, and the two on/off rows. */
export function AccountDetailSkeleton() {
  return (
    <View className="gap-5">
      <View className="gap-2 rounded-card bg-surface p-5 dark:bg-surface-dark">
        <Skeleton width={70} height={13} />
        <Skeleton width={170} height={34} radius={8} />
      </View>

      <Skeleton width="100%" height={52} radius={14} />

      <View className="flex-row gap-3">
        <StatCard />
        <StatCard />
      </View>

      <SwitchRowSkeleton />
      <SwitchRowSkeleton />
    </View>
  );
}
