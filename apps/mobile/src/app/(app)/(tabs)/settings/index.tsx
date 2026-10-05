import {
  useAccounts,
  useBudgets,
  useCategories,
  useGoals,
  useProfile,
  useSession,
  useTags,
  useUpdateProfile,
} from '@repo/core/hooks';
import { Avatar, ListRow, Screen, SwitchRow } from '@repo/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { SettingsSkeleton } from '../../../../features/settings/settings-skeleton';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { data: profile } = useProfile();
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
      <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Opciones</Text>

      {__DEV__ ? (
        // Temporal — solo para probar el carrusel sin tener que registrar
        // una cuenta nueva cada vez. Borrar este bloque antes de lanzar (no
        // aparece en producción de todos modos, __DEV__ es false ahí).
        <SwitchRow
          label="🧪 Dev: mostrar tour"
          description="Prende/apaga el carrusel de bienvenida"
          value={profile?.has_seen_tour === false}
          onValueChange={(next) => updateProfile.mutate({ has_seen_tour: !next })}
        />
      ) : null}

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <>
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
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title="Objetivos"
              subtitle={`${activeGoals} objetivo${activeGoals === 1 ? '' : 's'}`}
              showChevron
              onPress={() => router.push('/(app)/settings/goals')}
            />
          </View>

          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            <ListRow
              title="Personalizar inicio"
              subtitle="Orden de las tarjetas de la pantalla principal"
              showChevron
              onPress={() => router.push('/(app)/settings/home-layout')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title="Preferencias"
              subtitle="Moneda, tema e idioma"
              showChevron
              onPress={() => router.push('/(app)/settings/preferences')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title="Importar y exportar"
              subtitle="Comparte o migra tus movimientos vía Excel"
              showChevron
              onPress={() => router.push('/(app)/settings/import-export')}
            />
            <View className="h-px bg-line dark:bg-line-dark" />
            <ListRow
              title="Ver tour de nuevo"
              subtitle="Repite la introducción a la app"
              onPress={() => updateProfile.mutate({ has_seen_tour: false })}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
