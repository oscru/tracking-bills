import { useSession, useSignOut } from '@repo/core/hooks';
import { Avatar, Button, Screen } from '@repo/ui';
import { Text, View } from 'react-native';

import { ProfileSkeleton } from '../../features/profile/profile-skeleton';

export default function ProfileScreen() {
  const { user, loading } = useSession();
  const signOut = useSignOut();

  return (
    <Screen className="gap-6">
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <View className="items-center gap-3 pt-6">
          <Avatar name={user?.email} size={72} />
          {user?.email ? (
            <Text className="text-base text-ink dark:text-ink-dark">{user.email}</Text>
          ) : null}
        </View>
      )}

      <View className="mt-auto">
        <Button
          label="Cerrar sesión"
          variant="secondary"
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
      </View>
    </Screen>
  );
}
