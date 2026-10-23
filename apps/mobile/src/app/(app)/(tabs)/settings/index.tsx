import {
  useAccounts,
  useBudgets,
  useCategories,
  useGoals,
  useSession,
  useTags,
  useUpdateProfile,
} from '@repo/core/hooks';
import { Avatar, ListRow, Screen, useIsDesktop, useTabBarScrollPadding } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SettingsSkeleton } from '../../../../features/settings/settings-skeleton';

export default function SettingsScreen() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const desktop = useIsDesktop();
  const { t } = useTranslation(['settings', 'home']);
  const { user } = useSession();
  const updateProfile = useUpdateProfile();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: tags, isLoading: loadingTags } = useTags();
  const { data: budgets, isLoading: loadingBudgets } = useBudgets();
  const { data: goals, isLoading: loadingGoals } = useGoals();
  const loading =
    loadingAccounts || loadingCategories || loadingTags || loadingBudgets || loadingGoals;

  const customCategories = (categories ?? []).length;
  const activeBudgets = (budgets ?? []).length;
  const activeGoals = (goals ?? []).filter((g) => !g.archived).length;
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived).length;
  const activeTags = (tags ?? []).filter((t) => !t.archived).length;

  return (
    <Screen edges={['top']} className="gap-6">
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">{t('title')}</Text>

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollPadding }}
        >
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            className="flex-row items-center gap-3 rounded-2xl border border-line px-4 py-4 active:opacity-60 dark:border-line-dark"
          >
            <Avatar name={user?.email} size={48} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink dark:text-ink-dark">
                {user?.email?.split('@')[0] ?? t('welcome')}
              </Text>
              {user?.email ? (
                <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{user.email}</Text>
              ) : null}
            </View>
            <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
          </Pressable>

          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            <ListRow
              title={t('rows.accounts')}
              subtitle={t('rows.accountsCount', { count: activeAccounts })}
              showChevron
              onPress={() => router.push('/(app)/settings/accounts')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.categories')}
              subtitle={t('rows.categoriesCount', { count: customCategories })}
              showChevron
              onPress={() => router.push('/(app)/settings/categories')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.tags')}
              subtitle={t('rows.tagsCount', { count: activeTags })}
              showChevron
              onPress={() => router.push('/(app)/settings/tags')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.budgets')}
              subtitle={t('rows.budgetsCount', { count: activeBudgets })}
              showChevron
              onPress={() => router.push('/(app)/settings/budgets')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.goals')}
              subtitle={t('rows.goalsCount', { count: activeGoals })}
              showChevron
              onPress={() => router.push('/(app)/settings/goals')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.peers')}
              subtitle={t('rows.peersHint')}
              showChevron
              onPress={() => router.push('/(app)/settings/peers')}
            />
          </View>

          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            <ListRow
              // The web dashboard arranges and resizes its widgets on Inicio
              // itself; the app orders them here (see `home-layout`).
              title={t(desktop ? 'home:layout.webTitle' : 'home:layout.appTitle')}
              subtitle={t(desktop ? 'home:layout.settingsRowWeb' : 'home:layout.settingsRowApp')}
              showChevron
              onPress={() => router.push('/(app)/settings/home-layout')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.security')}
              subtitle={t('rows.securityHint')}
              showChevron
              onPress={() => router.push('/(app)/settings/security')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.notifications')}
              subtitle={t('rows.notificationsHint')}
              showChevron
              onPress={() => router.push('/(app)/settings/notifications')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.preferences')}
              subtitle={t('rows.preferencesHint')}
              showChevron
              onPress={() => router.push('/(app)/settings/preferences')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.importExport')}
              subtitle={t('rows.importExportHint')}
              showChevron
              onPress={() => router.push('/(app)/settings/import-export')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title={t('rows.tour')}
              subtitle={t('rows.tourHint')}
              onPress={() => updateProfile.mutate({ has_seen_tour: false })}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
