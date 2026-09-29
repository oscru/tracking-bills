import { useAccounts, useBudgets, useCategories, useSession, useTags } from '@repo/core/hooks';
import { Avatar, ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: budgets } = useBudgets();

  const customCategories = (categories ?? []).length;
  const activeBudgets = (budgets ?? []).length;
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived).length;
  const activeTags = (tags ?? []).filter((t) => !t.archived).length;

  return (
    <Screen className="gap-6">
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Opciones</Text>

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
          subtitle={`${customCategories} categorías`}
          showChevron
          onPress={() => router.push('/(app)/settings/categories')}
        />
        <View className="h-px bg-line dark:bg-line-dark" />
        <ListRow
          title="Tags"
          subtitle={`${activeTags} activa${activeTags === 1 ? '' : 's'}`}
          showChevron
          onPress={() => router.push('/(app)/settings/tags')}
        />
        <View className="h-px bg-line dark:bg-line-dark" />
        <ListRow
          title="Presupuestos"
          subtitle={`${activeBudgets} presupuesto${activeBudgets === 1 ? '' : 's'}`}
          showChevron
          onPress={() => router.push('/(app)/settings/budgets')}
        />
      </View>

      <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
        <ListRow
          title="Personalizar inicio"
          subtitle="Orden de las tarjetas de la pantalla principal"
          showChevron
          onPress={() => router.push('/(app)/settings/home-layout')}
        />
      </View>
    </Screen>
  );
}
