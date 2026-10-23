import { useCategories, useTransactions } from '@repo/core/hooks';
import { buildExportWorkbookBase64 } from '@repo/core/import-export';
import { ListRow, PageHeader, Screen, useTabBarScrollPadding } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Text, View, ScrollView } from 'react-native';

import { saveAndShareXlsx } from '../../../../../features/import-export/file-io';

export default function ImportExportScreen() {
  const { t } = useTranslation('importExport');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const [exporting, setExporting] = useState(false);

  const exportMovements = async () => {
    if (!transactions || !categories) return;
    setExporting(true);
    try {
      const base64 = await buildExportWorkbookBase64({ transactions, categories });
      await saveAndShareXlsx(
        base64,
        t('fileName', { date: new Date().toISOString().slice(0, 10) }),
      );
    } catch (err) {
      Alert.alert(t('exportFailed'), err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title={t('title')} onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6"
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{t('export')}</Text>
          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            <ListRow
              title={t('exportTitle')}
              subtitle={t('exportHint')}
              icon={exporting ? undefined : 'share-outline'}
              trailing={exporting ? <ActivityIndicator /> : undefined}
              showChevron={!exporting}
              onPress={exporting ? undefined : exportMovements}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">{t('import')}</Text>
          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            <ListRow
              title={t('importTitle')}
              subtitle={t('importHint')}
              icon="document-attach-outline"
              showChevron
              onPress={() => router.push('/(app)/settings/import-export/import')}
            />
          </View>
        </View>

        <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
          {t('autoCreate')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
