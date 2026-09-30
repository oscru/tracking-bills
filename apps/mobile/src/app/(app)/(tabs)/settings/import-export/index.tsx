import { useCategories, useTransactions } from '@repo/core/hooks';
import { buildExportWorkbookBase64 } from '@repo/core/import-export';
import { ListRow, PageHeader, Screen } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { saveAndShareXlsx } from '../../../../../features/import-export/file-io';

export default function ImportExportScreen() {
  const router = useRouter();
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const [exporting, setExporting] = useState(false);

  const exportMovements = async () => {
    if (!transactions || !categories) return;
    setExporting(true);
    try {
      const base64 = buildExportWorkbookBase64({ transactions, categories });
      await saveAndShareXlsx(base64, `movimientos-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      Alert.alert('No se pudo exportar', err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title="Importar y exportar" onBack={() => router.back()} />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Exportar</Text>
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          <ListRow
            title="Exportar movimientos"
            subtitle="Genera un Excel con tus movimientos y transferencias"
            icon={exporting ? undefined : 'share-outline'}
            trailing={exporting ? <ActivityIndicator /> : undefined}
            showChevron={!exporting}
            onPress={exporting ? undefined : exportMovements}
          />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Importar</Text>
        <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
          <ListRow
            title="Importar desde Excel"
            subtitle="Sube un archivo y crea tus movimientos automáticamente"
            icon="document-attach-outline"
            showChevron
            onPress={() => router.push('/(app)/settings/import-export/import')}
          />
        </View>
      </View>

      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        Las cuentas, categorías y tags que no existan todavía se crean automáticamente al importar.
      </Text>
    </Screen>
  );
}
