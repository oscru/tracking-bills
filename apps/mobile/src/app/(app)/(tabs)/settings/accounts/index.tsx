import { useAccountBalanceEffects, useAccounts } from '@repo/core/hooks';
import { balancesFromEffects, formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import {
  AccountsEmptyIllustration,
  EmptyState,
  ErrorCard,
  ListRow,
  PageHeader,
  Screen,
  SegmentedControl,
  StaggerItem,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View, ScrollView } from 'react-native';

import { AccountIcon } from '../../../../../features/accounts/account-icon';
import { accountTypeLabel } from '../../../../../features/accounts/account-types';
import { useTabBarAction } from '../../../../../features/navigation/floating-tab-bar';
import {
  MasterDetailEmpty,
  useInListPane,
  useMasterDetailPanes,
} from '../../../../../features/settings/master-detail';

const STATUS_OPTIONS: { value: 'active' | 'archived'; label: string }[] = [
  { value: 'active', label: 'active' },
  { value: 'archived', label: 'archived' },
];

/** The section's list — on a wide desktop, also drawn beside the open record (see `_layout`). */
export function AccountsList() {
  const { t } = useTranslation('accounts');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  // Desktop: the record open in the pane beside this list.
  const { id: selectedId } = useGlobalSearchParams<{ id?: string }>();
  const inPane = useInListPane();
  const { data: accounts, isLoading, error } = useAccounts();
  // Every account's balance from the balance view (summed by Postgres, and
  // shared with Inicio) — not the whole transaction history.
  const { data: balanceEffects } = useAccountBalanceEffects();
  const balances = useMemo(
    () => balancesFromEffects(accounts ?? [], balanceEffects ?? []),
    [accounts, balanceEffects],
  );
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const visible = (accounts ?? []).filter((a) =>
    status === 'archived' ? a.archived : !a.archived,
  );

  useTabBarAction(
    inPane
      ? false
      : {
          icon: Plus,
          accessibilityLabel: t('new'),
          onPress: () => router.push('/(app)/settings/accounts/new'),
        },
  );

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title={t('title')} onBack={() => router.back()} />
      <SegmentedControl
        options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(`tabs.${o.value}`) }))}
        value={status}
        onChange={setStatus}
      />

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : error ? (
        <View className="mt-8">
          <ErrorCard message={toFriendlyMessage(error, t('loadFailed'))} />
        </View>
      ) : visible.length === 0 ? (
        <EmptyState
          illustration={<AccountsEmptyIllustration />}
          title={t(status === 'archived' ? 'emptyArchived' : 'empty')}
          description={status === 'archived' ? undefined : t('emptyHint')}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
            {visible.map((a, i) => (
              <StaggerItem key={a.id} index={i}>
                {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                <ListRow
                  title={a.name}
                  subtitle={accountTypeLabel(a.type)}
                  leading={<AccountIcon account={a} />}
                  trailing={
                    <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
                      {formatCurrency(balances.get(a.id) ?? 0, a.currency)}
                    </Text>
                  }
                  showChevron
                  selected={inPane && selectedId === a.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/settings/accounts/[id]',
                      params: { id: a.id },
                    })
                  }
                />
              </StaggerItem>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * The section's index route. Desktop: the list lives in the layout's left
 * pane, so this is the right pane's "nothing open yet" state. Phones: the
 * list itself.
 */
export default function AccountsScreen() {
  const { t } = useTranslation('accounts');
  const panes = useMasterDetailPanes();
  const router = useRouter();
  if (!panes) return <AccountsList />;
  return (
    <MasterDetailEmpty
      illustration={<AccountsEmptyIllustration />}
      title={t('pickTitle')}
      description={t('pickHint')}
      action={{
        icon: Plus,
        accessibilityLabel: t('new'),
        onPress: () => router.push('/(app)/settings/accounts/new'),
      }}
    />
  );
}
