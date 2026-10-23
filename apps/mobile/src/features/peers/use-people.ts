import { i18n } from '@repo/core/i18n';
import { useAccountBalanceEffects, useLinkedPeers, usePeerAccounts } from '@repo/core/hooks';
import type { LinkedPeer } from '@repo/core/supabase';
import type { Account } from '@repo/core/types';
import { balancesFromEffects } from '@repo/core/utils';
import { useMemo } from 'react';

/** One person you've been linked with, and every account you have with them. */
export interface Person {
  peerId: string;
  name: string;
  /** The live link; null once unlinked (their history stays, read-only). */
  link: LinkedPeer | null;
  /** Your contact accounts for them — one per currency you've used. */
  accounts: Account[];
  /**
   * Net sent between you, per currency: positive = you've sent them more
   * than they've sent you. (A contact account's balance is exactly that.)
   */
  net: Map<string, number>;
}

/**
 * The people you're (or were) linked with, each with all their contact
 * accounts grouped together — one card per person, however many currencies
 * you've used. Linked people first, then unlinked ones (their history
 * stays), each group by name.
 */
export function usePeople() {
  const { data: peers, isLoading: loadingPeers } = useLinkedPeers();
  const { data: contacts, isLoading: loadingContacts } = usePeerAccounts();
  const { data: effects } = useAccountBalanceEffects();

  const people = useMemo(() => {
    const balances = balancesFromEffects(contacts ?? [], effects ?? []);
    const linked = (peers ?? []).filter((p) => p.status === 'accepted' && p.peerId);
    const byPeer = new Map<string, Person>();
    for (const link of linked) {
      byPeer.set(link.peerId!, {
        peerId: link.peerId!,
        name: link.peerName ?? i18n.t('peers:person'),
        link,
        accounts: [],
        net: new Map(),
      });
    }
    for (const account of contacts ?? []) {
      const peerId = account.peer_user_id;
      if (!peerId) continue;
      const person =
        byPeer.get(peerId) ??
        ({ peerId, name: account.name, link: null, accounts: [], net: new Map() } as Person);
      byPeer.set(peerId, person);
      person.accounts.push(account);
      person.net.set(
        account.currency,
        (person.net.get(account.currency) ?? 0) + (balances.get(account.id) ?? 0),
      );
    }
    return [...byPeer.values()].sort(
      (a, b) => Number(b.link != null) - Number(a.link != null) || a.name.localeCompare(b.name),
    );
  }, [peers, contacts, effects]);

  const myInvite = (peers ?? []).find((p) => p.status === 'pending' && p.isInviter) ?? null;

  return { people, myInvite, isLoading: loadingPeers || loadingContacts };
}
