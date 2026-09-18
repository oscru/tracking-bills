import { useAccounts, useCategories } from '@repo/core/hooks';
import { ListRow, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const customCategories = (categories ?? []).filter((c) => !c.is_default).length;
  const activeAccounts = (accounts ?? []).filter((a) => !a.archived).length;

  return (
    <Screen className="gap-6">
      <Text className="pt-2 text-2xl font-bold text-ink dark:text-ink-dark">Opciones</Text>

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
