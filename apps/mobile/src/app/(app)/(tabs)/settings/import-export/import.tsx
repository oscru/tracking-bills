import {
  useAccounts,
  useCategories,
  useProfile,
  useRunImportPlan,
  useTags,
} from '@repo/core/hooks';
import {
  buildImportPlan,
  parseWorkbook,
  readWorkbookFromBase64,
  type ImportPlan,
} from '@repo/core/import-export';
import { Button, PageHeader, Screen, ICON_COLORS } from '@repo/ui';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { CircleAlert, CircleCheck, Paperclip, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  readPickedFileAsBase64,
  XLSX_MIME_TYPES,
} from '../../../../../features/import-export/file-io';

type Step =
  | { name: 'pick' }
  | { name: 'reading' }
  | { name: 'preview'; fileName: string; plan: ImportPlan }
  | { name: 'importing'; plan: ImportPlan }
  | {
      name: 'done';
      result: {
        accountsCreated: number;
        categoriesCreated: number;
        tagsCreated: number;
        transactionsCreated: number;
      };
    }
  | { name: 'error'; message: string };

export default function ImportScreen() {
  const { t } = useTranslation(['importExport', 'common']);
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: profile } = useProfile();
  const runPlan = useRunImportPlan();
  const [step, setStep] = useState<Step>({ name: 'pick' });

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: XLSX_MIME_TYPES });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setStep({ name: 'reading' });
    try {
      if (!accounts || !categories || !tags || !profile) {
        throw new Error(t('stillLoading'));
      }
      const base64 = await readPickedFileAsBase64(asset);
      const sheets = await readWorkbookFromBase64(base64);
      const parsed = parseWorkbook(sheets);
      const plan = buildImportPlan(parsed, { accounts, categories, tags }, profile.currency);
      setStep({ name: 'preview', fileName: asset.name, plan });
    } catch (err) {
      setStep({ name: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const confirmImport = (plan: ImportPlan) => {
    setStep({ name: 'importing', plan });
    runPlan.mutate(plan, {
      onSuccess: (result) => setStep({ name: 'done', result }),
      onError: (err) =>
        setStep({ name: 'error', message: err instanceof Error ? err.message : String(err) }),
    });
  };

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title={t('importScreen')} onBack={() => router.back()} />

      {step.name === 'pick' ? (
        <StatusView icon={Paperclip} tint="neutral" title={t('pickTitle')} subtitle={t('pickHint')}>
          <Button label={t('pickFile')} onPress={pickFile} />
        </StatusView>
      ) : null}

      {step.name === 'reading' ? <StatusView spinner title={t('reading')} /> : null}

      {step.name === 'preview' ? (
        <PreviewStep
          fileName={step.fileName}
          plan={step.plan}
          onConfirm={() => confirmImport(step.plan)}
          onCancel={() => setStep({ name: 'pick' })}
        />
      ) : null}

      {step.name === 'importing' ? (
        <StatusView spinner title={t('importing')} subtitle={t('importingHint')} />
      ) : null}

      {step.name === 'done' ? (
        <StatusView icon={CircleCheck} tint="lime" title={t('done')}>
          <SummaryCard>
            <SummaryLine label={t('created')} value={step.result.transactionsCreated} />
            <SummaryLine label={t('newAccounts')} value={step.result.accountsCreated} />
            <SummaryLine label={t('newCategories')} value={step.result.categoriesCreated} />
            <SummaryLine label={t('newTags')} value={step.result.tagsCreated} />
          </SummaryCard>
          <Button label={t('common:done')} onPress={() => router.back()} />
        </StatusView>
      ) : null}

      {step.name === 'error' ? (
        <StatusView icon={CircleAlert} tint="danger" title={t('failed')} subtitle={step.message}>
          <Button
            label={t('retry')}
            variant="secondary"
            onPress={() => setStep({ name: 'pick' })}
          />
        </StatusView>
      ) : null}
    </Screen>
  );
}

const ICON_TINT = {
  neutral: { bg: 'bg-[#F1F2F4] dark:bg-line-dark', color: ICON_COLORS.ink3 },
  lime: { bg: 'bg-lime-tint dark:bg-lime-tint-dark', color: ICON_COLORS.limeInk },
  danger: { bg: 'bg-danger-tint dark:bg-danger-tint-dark', color: ICON_COLORS.danger },
} as const;

/** Centered full-bleed status: icon badge, headline, optional subtitle, then
 * whatever action/content the step needs below. Shared by every step here
 * except the scrollable preview, which has its own layout. */
function StatusView({
  icon: Icon,
  tint = 'neutral',
  spinner = false,
  title,
  subtitle,
  children,
}: {
  icon?: LucideIcon;
  tint?: keyof typeof ICON_TINT;
  spinner?: boolean;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { bg, color } = ICON_TINT[tint];
  return (
    <View className="flex-1 items-center justify-center gap-6 px-4">
      <View className={`h-20 w-20 items-center justify-center rounded-full ${bg}`}>
        {spinner ? (
          <ActivityIndicator size="large" color={color} />
        ) : Icon ? (
          <Icon size={36} color={color} />
        ) : null}
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink dark:text-ink-dark">{title}</Text>
        {subtitle ? (
          <Text className="text-center text-sm leading-5 text-ink-2 dark:text-ink-2-dark">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children ? <View className="w-full gap-4">{children}</View> : null}
    </View>
  );
}

function SummaryCard({ children }: { children: ReactNode }) {
  return (
    <View className="w-full gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
      {children}
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-center justify-between gap-6">
      <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{label}</Text>
      <Text className="text-base font-semibold text-ink dark:text-ink-dark">{value}</Text>
    </View>
  );
}

function PreviewStep({
  fileName,
  plan,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  plan: ImportPlan;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(['importExport', 'common']);
  const { summary, issues } = plan;
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const canImport = summary.transactionsToCreate > 0;

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8">
      <Text className="text-sm text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
        {fileName}
      </Text>

      <View className="gap-2 rounded-2xl border border-line p-4 dark:border-line-dark">
        <SummaryLine label={t('toCreate')} value={summary.transactionsToCreate} />
        <SummaryLine label={t('newAccounts')} value={summary.accountsToCreate} />
        <SummaryLine label={t('newCategoriesFull')} value={summary.categoriesToCreate} />
        <SummaryLine label={t('newTags')} value={summary.tagsToCreate} />
      </View>

      {errors.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
            {t('errorRows', { count: errors.length })}
          </Text>
          <IssueList issues={errors} />
        </View>
      ) : null}

      {warnings.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-warning dark:text-warning-dark">
            {t('warnings', { count: warnings.length })}
          </Text>
          <IssueList issues={warnings} />
        </View>
      ) : null}

      {!canImport ? (
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{t('nothing')}</Text>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button label={t('common:cancel')} variant="secondary" onPress={onCancel} />
        </View>
        <View className="flex-1">
          <Button label={t('confirm')} onPress={onConfirm} disabled={!canImport} />
        </View>
      </View>
    </ScrollView>
  );
}

function IssueList({ issues }: { issues: ImportPlan['issues'] }) {
  const { t } = useTranslation('importExport');
  return (
    <View className="gap-1.5 rounded-2xl border border-line p-3 dark:border-line-dark">
      {issues.slice(0, 30).map((issue, i) => (
        <Text key={i} className="text-xs text-ink-2 dark:text-ink-2-dark">
          {t('issue', { sheet: issue.sheet, row: issue.row, message: issue.message })}
        </Text>
      ))}
      {issues.length > 30 ? (
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
          {t('more', { count: issues.length - 30 })}
        </Text>
      ) : null}
    </View>
  );
}
