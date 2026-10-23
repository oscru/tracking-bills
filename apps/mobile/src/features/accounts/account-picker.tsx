import { useAccounts, useLinkedPeers } from '@repo/core/hooks';
import type { Account } from '@repo/core/types';
import { BottomSheet, ICON_COLORS } from '@repo/ui';
import { Check, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AccountIcon } from './account-icon';
import { accountTypeLabel } from './account-types';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Hide this account (e.g. the transfer's "from" account in the "to" picker). */
  excludeId?: string | null;
  /** Hide these accounts too (e.g. accounts already linked to another goal). */
  excludeIds?: string[];
  /** Only show accounts in this currency — a transfer/contribution can't cross currencies without a conversion step this app doesn't have. */
  currencyFilter?: string | null;
  /** Also offer linked people (a transfer's destination) — called with the person's id. */
  onSelectPeer?: (peerId: string, peerName: string) => void;
  /** The person currently selected, if the destination is one. */
  selectedPeerId?: string | null;
}

/** Searchable flat list of active accounts — avoids an unbounded row of pills. */
export function AccountPicker({
  visible,
  onClose,
  title,
  selectedId,
  onSelect,
  excludeId,
  excludeIds,
  currencyFilter,
  onSelectPeer,
  selectedPeerId,
}: Props) {
  const { t } = useTranslation('accounts');
  const [q, setQ] = useState('');
  const { data: accounts } = useAccounts();
  const { data: peers } = useLinkedPeers();
  const people = useMemo(() => {
    if (!onSelectPeer) return [];
    const needle = q.trim().toLowerCase();
    return (peers ?? []).filter(
      (p) =>
        p.status === 'accepted' &&
        p.peerId != null &&
        (!needle || (p.peerName ?? '').toLowerCase().includes(needle)),
    );
  }, [peers, onSelectPeer, q]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const active = (accounts ?? []).filter(
      (a: Account) =>
        !a.archived &&
        a.id !== excludeId &&
        !excludeIds?.includes(a.id) &&
        (!currencyFilter || a.currency === currencyFilter),
    );
    if (!needle) return active;
    return active.filter((a) => a.name.toLowerCase().includes(needle));
  }, [accounts, q, excludeId, excludeIds, currencyFilter]);

  const pick = (id: string) => {
    onSelect(id);
    setQ('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title ?? t('picker.title')}>
      <View className="px-5 pb-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('picker.search')}
          placeholderTextColor={ICON_COLORS.ink3}
          className="h-11 rounded-ctl border border-line bg-surface px-3 text-[15px] text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        />
      </View>

      <ScrollView className="max-h-[420px]" contentContainerClassName="pb-4">
        {people.length > 0 ? (
          <>
            <Text className="px-5 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
              {t('picker.people')}
            </Text>
            {people.map((p) => {
              // Known up front instead of failing on save: they need an
              // active account set to receive in this currency.
              const canReceive = !currencyFilter || p.receiveCurrencies.includes(currencyFilter);
              return (
                <Pressable
                  key={p.linkId}
                  disabled={!canReceive}
                  onPress={() => {
                    onSelectPeer?.(p.peerId!, p.peerName ?? t('picker.person'));
                    setQ('');
                    onClose();
                  }}
                  className={`flex-row items-center gap-3 border-t border-line px-5 py-3 dark:border-line-dark ${
                    canReceive ? '' : 'opacity-50'
                  }`}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                    <UserRound size={18} color={ICON_COLORS.limeInk} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
                      {p.peerName ?? t('picker.person')}
                    </Text>
                    <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                      {canReceive
                        ? t('picker.peerReceives')
                        : t('picker.peerCantReceive', { currency: currencyFilter })}
                    </Text>
                  </View>
                  {selectedPeerId === p.peerId ? (
                    <Check size={18} color={ICON_COLORS.limeInk} />
                  ) : null}
                </Pressable>
              );
            })}
            <Text className="px-5 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
              {t('picker.yours')}
            </Text>
          </>
        ) : null}
        {filtered.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => pick(a.id)}
            className="flex-row items-center gap-3 border-t border-line px-5 py-3 dark:border-line-dark"
          >
            <AccountIcon account={a} />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">{a.name}</Text>
              <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                {accountTypeLabel(a.type)} · {a.currency}
              </Text>
            </View>
            {selectedId === a.id ? <Check size={18} color={ICON_COLORS.limeInk} /> : null}
          </Pressable>
        ))}

        {filtered.length === 0 ? (
          <Text className="px-5 py-4 text-sm text-ink-2 dark:text-ink-2-dark">
            {t('picker.noMatches')}
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
