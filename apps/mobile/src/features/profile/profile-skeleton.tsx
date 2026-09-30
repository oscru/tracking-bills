import { Skeleton } from '@repo/ui';
import { View } from 'react-native';

export function ProfileSkeleton() {
  return (
    <View className="items-center gap-3 pt-6">
      <Skeleton width={72} height={72} radius={36} />
      <Skeleton width={160} height={15} />
    </View>
  );
}
