import { Ionicons } from '@expo/vector-icons';
import { useAccounts, useCategories, useProfile, useRunImportPlan, useTags } from '@repo/core/hooks';
import { buildImportPlan, parseWorkbook, readWorkbookFromBase64, type ImportPlan } from '@repo/core/import-export';
import { Button, PageHeader, Screen } from '@repo/ui';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { readPickedFileAsBase64, XLSX_MIME_TYPES } from '../../../../../features/import-export/file-io';

type Step =
  | { name: 'pick' }
  | { name: 'reading' }
  | { name: 'preview'; fileName: string; plan: ImportPlan }
  | { name: 'importing'; plan: ImportPlan }
  | { name: 'done'; result: { accountsCreated: number; categoriesCreated: number; tagsCreated: number; transactionsCreated: number } }
  | { name: 'error'; message: string };

export default function ImportScreen() {
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
        throw new Error('Aún se están cargando tus datos, intenta de nuevo.');
      }
      const base64 = await readPickedFileAsBase64(asset);
      const sheets = readWorkbookFromBase64(base64);
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
      onError: (err) => setStep({ name: 'error', message: err instanceof Error ? err.message : String(err) }),
    });
  };

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title="Importar Excel" onBack={() => router.back()} />

      {step.name === 'pick' ? (
        <StatusView
          icon="document-attach-outline"
          tint="neutral"
          title="Elige un archivo"
          subtitle="Sube un .xlsx con tus movimientos — podrás revisar todo antes de confirmar."
        >
          <Button label="Elegir archivo" onPress={pickFile} />
        </StatusView>
      ) : null}

      {step.name === 'reading' ? (
        <StatusView spinner title="Leyendo el archivo…" />
      ) : null}

      {step.name === 'preview' ? (
        <PreviewStep fileName={step.fileName} plan={step.plan} onConfirm={() => confirmImport(step.plan)} onCancel={() => setStep({ name: 'pick' })} />
      ) : null}

      {step.name === 'importing' ? (
        <StatusView spinner title="Importando…" subtitle="Esto puede tardar unos segundos." />
      ) : null}

      {step.name === 'done' ? (
        <StatusView icon="checkmark-circle" tint="lime" title="¡Importación completa!">
          <SummaryCard>
            <SummaryLine label="Movimientos creados" value={step.result.transactionsCreated} />
            <SummaryLine label="Cuentas nuevas" value={step.result.accountsCreated} />
            <SummaryLine label="Categorías nuevas" value={step.result.categoriesCreated} />
            <SummaryLine label="Tags nuevos" value={step.result.tagsCreated} />
          </SummaryCard>
          <Button label="Listo" onPress={() => router.back()} />
        </StatusView>
      ) : null}

      {step.name === 'error' ? (
        <StatusView icon="alert-circle" tint="danger" title="Algo salió mal" subtitle={step.message}>
          <Button label="Reintentar" variant="secondary" onPress={() => setStep({ name: 'pick' })} />
        </StatusView>
      ) : null}
    </Screen>
  );
}

const ICON_TINT = {
  neutral: { bg: 'bg-[#F1F2F4] dark:bg-line-dark', color: '#9CA3AF' },
  lime: { bg: 'bg-lime-tint dark:bg-lime-tint-dark', color: '#4D7C0F' },
  danger: { bg: 'bg-danger-tint dark:bg-danger-tint-dark', color: '#E5484D' },
} as const;

/** Centered full-bleed status: icon badge, headline, optional subtitle, then
 * whatever action/content the step needs below. Shared by every step here
 * except the scrollable preview, which has its own layout. */
function StatusView({
  icon,
  tint = 'neutral',
  spinner = false,
  title,
  subtitle,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
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
        {spinner ? <ActivityIndicator size="large" color={color} /> : icon ? <Ionicons name={icon} size={36} color={color} /> : null}
      </View>
      <View className="items-center gap-2">
        <Text className="text-center text-xl font-bold text-ink dark:text-ink-dark">{title}</Text>
        {subtitle ? (
          <Text className="text-center text-sm leading-5 text-ink-2 dark:text-ink-2-dark">{subtitle}</Text>
        ) : null}
      </View>
      {children ? <View className="w-full gap-4">{children}</View> : null}
    </View>
  );
}

function SummaryCard({ children }: { children: ReactNode }) {
  return <View className="w-full gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">{children}</View>;
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
        <SummaryLine label="Movimientos y transferencias a crear" value={summary.transactionsToCreate} />
        <SummaryLine label="Cuentas nuevas" value={summary.accountsToCreate} />
        <SummaryLine label="Categorías/subcategorías nuevas" value={summary.categoriesToCreate} />
        <SummaryLine label="Tags nuevos" value={summary.tagsToCreate} />
      </View>

      {errors.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
            {errors.length} fila{errors.length === 1 ? '' : 's'} con error — no se {errors.length === 1 ? 'importará' : 'importarán'}
          </Text>
          <IssueList issues={errors} />
        </View>
      ) : null}

      {warnings.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-warning dark:text-warning-dark">
            {warnings.length} advertencia{warnings.length === 1 ? '' : 's'}
          </Text>
          <IssueList issues={warnings} />
        </View>
      ) : null}

      {!canImport ? (
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
          No hay movimientos válidos para importar en este archivo.
        </Text>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button label="Cancelar" variant="secondary" onPress={onCancel} />
        </View>
        <View className="flex-1">
          <Button label="Confirmar" onPress={onConfirm} disabled={!canImport} />
        </View>
      </View>
    </ScrollView>
  );
}

function IssueList({ issues }: { issues: ImportPlan['issues'] }) {
  return (
    <View className="gap-1.5 rounded-2xl border border-line p-3 dark:border-line-dark">
      {issues.slice(0, 30).map((issue, i) => (
        <Text key={i} className="text-xs text-ink-2 dark:text-ink-2-dark">
          {issue.sheet} · fila {issue.row}: {issue.message}
        </Text>
      ))}
      {issues.length > 30 ? (
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
          y {issues.length - 30} más…
        </Text>
      ) : null}
    </View>
  );
}
