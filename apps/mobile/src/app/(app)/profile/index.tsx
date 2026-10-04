import { useProfile, useSession, useSignOut } from '@repo/core/hooks';
import type { Gender } from '@repo/core/types';
import { formatDate } from '@repo/core/utils';
import { Avatar, Button, Fab, PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ProfileSkeleton } from '../../../features/profile/profile-skeleton';

const GENDER_LABEL: Record<Gender, string> = {
  female: 'Femenino',
  male: 'Masculino',
  other: 'Otro',
  prefer_not_to_say: 'Prefiero no decir',
};

const UNSET_LABEL = 'No especificado';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading: loadingSession } = useSession();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const signOut = useSignOut();

  const loading = loadingSession || loadingProfile;

  const rows = [
    { label: 'Nombre', value: profile?.full_name ?? UNSET_LABEL },
    {
      label: 'Fecha de nacimiento',
      value: profile?.birth_date ? formatDate(profile.birth_date) : UNSET_LABEL,
    },
    { label: 'Género', value: profile?.gender ? GENDER_LABEL[profile.gender] : UNSET_LABEL },
  ];

  return (
    <Screen edges={['top', 'bottom']} className="gap-5">
      <PageHeader title="Perfil" onBack={() => router.back()} />

      <View className="flex-1">
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <View className="gap-6">
            <View className="items-center gap-3 pt-2">
              <Avatar name={user?.email} size={72} />
              {user?.email ? (
                <Text className="text-base text-ink dark:text-ink-dark">{user.email}</Text>
              ) : null}
            </View>

            <View className="rounded-2xl border border-line dark:border-line-dark">
              {rows.map((r, i) => (
                <View
                  key={r.label}
                  className={`gap-0.5 px-4 py-3.5 ${i > 0 ? 'border-t border-line dark:border-line-dark' : ''}`}
                >
                  <Text className="text-xs text-ink-2 dark:text-ink-2-dark">{r.label}</Text>
                  <Text className="text-base text-ink dark:text-ink-dark">{r.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {loading ? null : (
          <View className="absolute bottom-6 right-5">
            <Fab
              icon="pencil"
              accessibilityLabel="Editar perfil"
              onPress={() => router.push('/(app)/profile/edit')}
            />
          </View>
        )}
      </View>

      <View className="gap-3">
        <Button
          label="Cerrar sesión"
          variant="secondary"
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
        <Pressable
          onPress={() => router.push('/(app)/profile/delete-account')}
          className="items-center py-2"
        >
          <Text className="text-sm font-medium text-danger dark:text-danger-dark">
            Eliminar cuenta
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
