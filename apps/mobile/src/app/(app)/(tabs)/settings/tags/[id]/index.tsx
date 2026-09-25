import { Ionicons } from '@expo/vector-icons';
import { useTags, useTransactions, useUpdateTag } from '@repo/core/hooks';
import { tagCounts } from '@repo/core/utils';
import { Button, ConfirmSheet, Fab, PageHeader, Screen } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TagDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: tags, isLoading: loadingTags } = useTags();
  const { data: transactions, isLoading: loadingTx } = useTransactions();
  const updateTag = useUpdateTag();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const tag = (tags ?? []).find((t) => t.id === id);

  const total = useMemo(() => {
    if (!tag) return 0;
    const { expense, income } = tagCounts(tag.id, transactions ?? []);
    return expense + income;
  }, [tag, transactions]);

  if (loadingTags || loadingTx) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!tag) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">Tag no encontrada.</Text>
      </Screen>
    );
  }

  const toggleArchive = () =>
    updateTag.mutate({ id: tag.id, patch: { archived: !tag.archived } });

  return (
    <Screen edges={['top']} className="gap-5">
      <PageHeader title={tag.name} onBack={() => router.back()} />

      <View className="flex-1 gap-5">
        <View className="flex-row items-center gap-2">
          <View
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: tag.color ?? '#94A3B8' }}
          />
          <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
            {tag.archived ? 'Archivada' : 'Tag'}
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push({ pathname: '/(app)/transactions', params: { tagId: tag.id } })
          }
          className="rounded-2xl border border-line bg-surface p-4 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
        >
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="swap-vertical" size={16} color={tag.color ?? '#4D7C0F'} />
            <Text className="text-xs font-semibold text-ink-2 dark:text-ink-2-dark">
              Transacciones
            </Text>
          </View>
          <Text className="mt-1 text-2xl font-bold text-ink dark:text-ink-dark">{total}</Text>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {total === 1 ? 'movimiento asociado' : 'movimientos asociados'} · toca para verlos
          </Text>
        </Pressable>

        <View className="absolute bottom-6 right-5">
          <Fab
            icon="pencil"
            accessibilityLabel="Editar tag"
            onPress={() =>
              router.push({
                pathname: '/(app)/settings/tags/[id]/edit',
                params: { id: tag.id },
              })
            }
          />
        </View>
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Button
          label={tag.archived ? 'Desarchivar' : 'Archivar'}
          variant={tag.archived ? 'secondary' : 'ghost-danger'}
          loading={updateTag.isPending}
          onPress={() => (tag.archived ? toggleArchive() : setConfirmArchive(true))}
        />
      </View>

      <ConfirmSheet
        visible={confirmArchive}
        title="¿Archivar tag?"
        description="Dejará de aparecer para elegirla en movimientos nuevos, pero seguirá visible en los gastos e ingresos que ya la tienen. Puedes desarchivarla cuando quieras."
        confirmLabel="Archivar"
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          toggleArchive();
        }}
      />
    </Screen>
  );
}
