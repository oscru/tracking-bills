import { useAccounts, useCategories, useSession, useSignOut } from '@repo/core/hooks';
import { Button, ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const signOut = useSignOut();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const customCategories = (categories ?? []).filter((c) => !c.is_default).length;
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived).length;

  return (
    <Screen className="gap-6">
      <Text className="pt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">Ajustes</Text>

      {user?.email ? (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</Text>
      ) : null}

      <View className="rounded-2xl border border-neutral-200 px-4 dark:border-neutral-800">
        <ListRow
          title="Cuentas"
          subtitle={`${activeAccounts} activa${activeAccounts === 1 ? '' : 's'}`}
          showChevron
          onPress={() => router.push('/(app)/settings/accounts')}
        />
        <View className="h-px bg-neutral-100 dark:bg-neutral-800" />
        <ListRow
          title="Categorías"
          subtitle={`${customCategories} propia${customCategories === 1 ? '' : 's'} + predeterminadas`}
          showChevron
          onPress={() => router.push('/(app)/settings/categories')}
        />
      </View>

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
