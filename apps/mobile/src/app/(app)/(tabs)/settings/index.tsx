import { useAccounts, useCategories, useSession } from '@repo/core/hooks';
import { Avatar, ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const customCategories = (categories ?? []).filter((c) => !c.is_default).length;
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived).length;

  return (
    <Screen className="gap-6">
      <Text className="pt-2 text-2xl font-bold text-ink dark:text-ink-dark">Opciones</Text>

      <Pressable
        onPress={() => router.push('/(app)/profile')}
        className="flex-row items-center gap-3 rounded-2xl border border-line px-4 py-4 active:opacity-60 dark:border-line-dark"
      >
        <Avatar name={user?.email} size={48} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink dark:text-ink-dark">
            {user?.email?.split('@')[0] ?? 'Bienvenido'}
          </Text>
          {user?.email ? (
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{user.email}</Text>
          ) : null}
        </View>
        <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
      </Pressable>

      <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
        <ListRow
          title="Cuentas"
          subtitle={`${activeAccounts} activa${activeAccounts === 1 ? '' : 's'}`}
          showChevron
          onPress={() => router.push('/(app)/settings/accounts')}
        />
        <View className="h-px bg-line dark:bg-line-dark" />
        <ListRow
          title="Categorías"
          subtitle={`${customCategories} propia${customCategories === 1 ? '' : 's'} + predeterminadas`}
          showChevron
          onPress={() => router.push('/(app)/settings/categories')}
        />
      </View>
    </Screen>
  );
}
