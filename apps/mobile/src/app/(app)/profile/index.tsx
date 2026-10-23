import { useProfile, useSession, useSignOut } from '@repo/core/hooks';
import type { Gender } from '@repo/core/types';
import { formatDate } from '@repo/core/utils';
import { Avatar, Button, Fab, PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { openLegal } from '../../../features/legal/legal';
import { ProfileSkeleton } from '../../../features/profile/profile-skeleton';

export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'legal']);
  const router = useRouter();
  const { user, loading: loadingSession } = useSession();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const signOut = useSignOut();

  const loading = loadingSession || loadingProfile;

  const rows = [
    { label: t('name'), value: profile?.full_name ?? t('unset') },
    {
      label: t('birthDateOptional'),
      value: profile?.birth_date ? formatDate(profile.birth_date) : t('unset'),
    },
    {
      label: t('genderOptional'),
      value: profile?.gender ? t(`genders.${profile.gender as Gender}`) : t('unset'),
    },
  ];

  return (
    <Screen edges={['top', 'bottom']} className="gap-5">
      <PageHeader title={t('title')} onBack={() => router.back()} />

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

            <View className="gap-2">
              <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
                {t('legal')}
              </Text>
              <View className="overflow-hidden rounded-2xl border border-line dark:border-line-dark">
                {(['terms', 'privacy', 'cookies'] as const).map((doc, i) => (
                  <Pressable
                    key={doc}
                    onPress={() => openLegal(doc)}
                    accessibilityRole="link"
                    className={`flex-row items-center justify-between px-4 py-3.5 active:opacity-70 ${
                      i > 0 ? 'border-t border-line dark:border-line-dark' : ''
                    }`}
                  >
                    <Text className="text-base text-ink dark:text-ink-dark">
                      {t(`legal:documents.${doc}`)}
                    </Text>
                    <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
                  </Pressable>
                ))}
              </View>
              {profile?.legal_accepted_at ? (
                <Text className="px-1 text-xs text-ink-3 dark:text-ink-3-dark">
                  {t('acceptedVersion', {
                    version: profile.legal_version,
                    date: formatDate(profile.legal_accepted_at.slice(0, 10)),
                  })}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {loading ? null : (
          <View className="absolute bottom-6 right-5">
            <Fab
              icon={Pencil}
              accessibilityLabel={t('edit')}
              onPress={() => router.push('/(app)/profile/edit')}
            />
          </View>
        )}
      </View>

      <View className="gap-3">
        <Button
          label={t('signOut')}
          variant="secondary"
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
        />
        <Pressable
          onPress={() => router.push('/(app)/profile/delete-account')}
          className="items-center py-2"
        >
          <Text className="text-sm font-medium text-danger dark:text-danger-dark">
            {t('deleteAccount')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
