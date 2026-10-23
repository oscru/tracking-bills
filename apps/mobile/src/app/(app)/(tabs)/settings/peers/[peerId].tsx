import { currentLocale } from '@repo/core/i18n';
import {
  useAccounts,
  useSetPeerReceiveAccount,
  useTransactions,
  useUnlinkPeer,
} from '@repo/core/hooks';
import type { TransactionWithRefs } from '@repo/core/supabase';
import { getDateFormat, formatCurrency, formatDate, toFriendlyMessage } from '@repo/core/utils';
import {
  Button,
  Chip,
  ConfirmSheet,
  ErrorCard,
  HeroCard,
  PageHeader,
  Screen,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AccountPicker } from '../../../../../features/accounts/account-picker';
import { SplitColumns } from '../../../../../features/design/split-columns';
import { PersonAvatar, netLabel } from '../../../../../features/peers/person-ui';
import { usePeople } from '../../../../../features/peers/use-people';

/** One transfer between you: which way it went, through which of your accounts. */
function TransferRow({
  tx,
  contactIds,
  onPress,
}: {
  tx: TransactionWithRefs;
  contactIds: Set<string>;
  onPress: () => void;
}) {
  const { t } = useTranslation('peers');
  // Sent: your account → their contact account. Received: the reverse.
  const sent = tx.to_account_id != null && contactIds.has(tx.to_account_id);
  const mine = sent ? tx.account : tx.to_account;
  const currency = tx.account?.currency ?? tx.to_account?.currency ?? 'MXN';
  const title = tx.description?.trim() || t(sent ? 'detail.youSent' : 'detail.theySent');
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3 active:opacity-60">
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${
          sent ? 'bg-line dark:bg-line-dark' : 'bg-lime-tint dark:bg-lime-tint-dark'
        }`}
      >
        <Text
          className={`text-base font-bold ${sent ? 'text-ink dark:text-ink-dark' : 'text-lime-ink dark:text-lime-ink-dark'}`}
        >
          {sent ? '↑' : '↓'}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-ink dark:text-ink-dark" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-ink-3 dark:text-ink-3-dark" numberOfLines={1}>
          {t(sent ? 'detail.fromAccount' : 'detail.toAccount', {
            account: mine?.name ?? t('detail.anAccount'),
          })}{' '}
          · {formatDate(tx.transaction_date)}
          {tx.is_completed ? '' : t('detail.pendingSuffix')}
        </Text>
      </View>
      <Text
        className={`text-[15px] font-semibold ${
          sent ? 'text-ink dark:text-ink-dark' : 'text-pos dark:text-pos-dark'
        }`}
      >
        {sent ? '−' : '+'}
        {formatCurrency(Number(tx.amount), currency)}
      </Text>
    </Pressable>
  );
}

/**
 * One person you're (or were) linked with: what's gone between you per
 * currency, where their transfers land, the full history of transfers —
 * every account you have with them together, filterable by currency — and
 * unlinking.
 */
export default function PersonDetail() {
  const { t } = useTranslation('peers');
  const { peerId } = useLocalSearchParams<{ peerId: string }>();
  const router = useRouter();
  const scrollPadding = useTabBarScrollPadding();
  const { people, isLoading } = usePeople();
  const { data: accounts } = useAccounts();
  const setReceive = useSetPeerReceiveAccount();
  const unlink = useUnlinkPeer();
  const [currency, setCurrency] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const person = people.find((p) => p.peerId === peerId) ?? null;
  const contactIds = useMemo(
    () => (person?.accounts ?? []).map((a) => a.id).sort(),
    [person?.accounts],
  );
  const { data: transfers, isLoading: loadingTx } = useTransactions(
    { accountIds: contactIds },
    { enabled: contactIds.length > 0 },
  );

  // Settled totals each way, per currency.
  const totals = useMemo(() => {
    const ids = new Set(contactIds);
    const map = new Map<string, { sent: number; received: number }>();
    for (const tx of transfers ?? []) {
      if (!tx.is_completed) continue;
      const sent = tx.to_account_id != null && ids.has(tx.to_account_id);
      const cur = tx.account?.currency ?? tx.to_account?.currency ?? 'MXN';
      const entry = map.get(cur) ?? { sent: 0, received: 0 };
      if (sent) entry.sent += Number(tx.amount);
      else entry.received += Number(tx.amount);
      map.set(cur, entry);
    }
    return map;
  }, [transfers, contactIds]);

  // The history, newest first, in month groups — narrowed to one currency
  // when a chip is picked.
  const months = useMemo(() => {
    const list = (transfers ?? [])
      .filter((tx) => !currency || (tx.account?.currency ?? tx.to_account?.currency) === currency)
      .sort(
        (a, b) =>
          b.transaction_date.localeCompare(a.transaction_date) ||
          b.created_at.localeCompare(a.created_at),
      );
    const groups: { key: string; label: string; items: TransactionWithRefs[] }[] = [];
    for (const tx of list) {
      const key = tx.transaction_date.slice(0, 7);
      let group = groups.at(-1);
      if (!group || group.key !== key) {
        const [y, m] = key.split('-').map(Number);
        const label = getDateFormat(currentLocale(), { month: 'long', year: 'numeric' }).format(
          new Date(y!, m! - 1, 1),
        );
        group = { key, label: label[0]!.toUpperCase() + label.slice(1), items: [] };
        groups.push(group);
      }
      group.items.push(tx);
    }
    return groups;
  }, [transfers, currency]);

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!person) {
    return (
      <Screen center>
        <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('notFound')}</Text>
      </Screen>
    );
  }

  const ids = new Set(contactIds);
  const currencies = person.accounts.map((a) => a.currency);
  const accountName = (id: string | null) =>
    (accounts ?? []).find((a) => a.id === id)?.name ?? null;

  const summary = (
    <>
      <View className="flex-row items-center gap-3">
        <PersonAvatar name={person.name} muted={!person.link} size={52} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
            {t(person.link ? 'detail.linkedStatus' : 'detail.unlinkedStatus')}
          </Text>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {person.link ? t('detail.canSend') : t('detail.cantSend')}
          </Text>
        </View>
      </View>

      {/* One headline per currency: who has sent the other more. */}
      {person.accounts.length === 0 ? (
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
          {t('detail.nothingYet', { name: person.name })}
        </Text>
      ) : (
        person.accounts.map((a) => {
          const net = person.net.get(a.currency) ?? 0;
          const total = totals.get(a.currency) ?? { sent: 0, received: 0 };
          return (
            <HeroCard key={a.id} contentStyle={{ gap: 6 }}>
              <Text className="text-[13px] font-semibold text-white/60">
                {a.currency} · {netLabel(net)}
              </Text>
              <Text className="text-3xl font-extrabold tracking-tight text-white">
                {formatCurrency(Math.abs(net), a.currency)}
              </Text>
              <Text className="text-xs text-white/60">
                {t('detail.sentReceived', {
                  sent: formatCurrency(total.sent, a.currency),
                  received: formatCurrency(total.received, a.currency),
                })}
              </Text>
            </HeroCard>
          );
        })
      )}

      {person.link ? (
        <View className="gap-2 rounded-card bg-surface p-4 dark:bg-surface-dark">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
            {t('detail.receivesIn')}
          </Text>
          {person.accounts.filter((a) => a.receive_into_account_id).length === 0 ? (
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{t('detail.noReceive')}</Text>
          ) : (
            person.accounts
              .filter((a) => a.receive_into_account_id)
              .map((a) => (
                <Text key={a.id} className="text-sm text-ink dark:text-ink-dark">
                  {accountName(a.receive_into_account_id) ?? t('detail.archivedAccount')} ·{' '}
                  {a.currency}
                </Text>
              ))
          )}
          <Pressable onPress={() => setReceiveOpen(true)} hitSlop={6} className="self-start">
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              {t('detail.changeCurrency')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ErrorCard message={error} />

      {person.link ? (
        <Button
          label={t('detail.unlink')}
          variant="ghost-danger"
          loading={unlink.isPending}
          onPress={() => setConfirmUnlink(true)}
        />
      ) : null}
    </>
  );

  const history = (
    <View className="gap-3">
      <Text className="text-base font-bold text-ink dark:text-ink-dark">{t('detail.history')}</Text>
      {currencies.length > 1 ? (
        <View className="flex-row flex-wrap gap-2">
          <Chip
            label={t('detail.all')}
            selected={currency == null}
            onPress={() => setCurrency(null)}
          />
          {currencies.map((c) => (
            <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </View>
      ) : null}
      {loadingTx ? (
        <ActivityIndicator className="mt-4" />
      ) : months.length === 0 ? (
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">{t('noTransfers')}.</Text>
      ) : (
        months.map((m) => (
          <View key={m.key} className="gap-1">
            <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
              {m.label}
            </Text>
            <View className="rounded-2xl border border-line px-4 dark:border-line-dark">
              {m.items.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 ? <View className="h-px bg-line dark:bg-line-dark" /> : null}
                  <TransferRow
                    tx={tx}
                    contactIds={ids}
                    onPress={() =>
                      router.push({ pathname: '/(app)/transactions/[id]', params: { id: tx.id } })
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <Screen edges={['top']} className="gap-5" width="wide">
      <PageHeader title={person.name} onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5"
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        <SplitColumns left={summary} right={history} leftWidth={360} minWidth={760} />
      </ScrollView>

      <AccountPicker
        visible={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title={t('whichAccount')}
        selectedId={null}
        onSelect={(accountId) => {
          setError(null);
          setReceive.mutate(
            { peerId: person.peerId, accountId },
            { onError: (e) => setError(toFriendlyMessage(e, t('detail.saveFailed'))) },
          );
        }}
      />

      <ConfirmSheet
        visible={confirmUnlink}
        title={t('detail.unlinkTitle', { name: person.name })}
        description={t('detail.unlinkBody')}
        confirmLabel={t('detail.unlink')}
        destructive
        onCancel={() => setConfirmUnlink(false)}
        onConfirm={() => {
          setConfirmUnlink(false);
          if (!person.link) return;
          setError(null);
          unlink.mutate(person.link.linkId, {
            onError: (e) => setError(toFriendlyMessage(e, t('detail.unlinkFailed'))),
          });
        }}
      />
    </Screen>
  );
}
