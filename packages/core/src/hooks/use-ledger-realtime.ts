import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '../supabase';
import { queryKeys } from './keys';

// Coalesces bursts (a save touches the row and its mirror; a sync updates
// several rows) into one refresh.
const DEBOUNCE_MS = 400;

/**
 * Keeps cached data in step with changes made elsewhere — another device,
 * or a linked person whose transfer the database just mirrored into this
 * user's ledger — without waiting for the 5-minute `staleTime`:
 * - Supabase Realtime: inserts/updates to the user's own transactions and
 *   links (Realtime applies RLS, so nothing else arrives);
 * - coming back to the foreground: events can be missed while backgrounded
 *   (the socket sleeps), and Realtime can't filter deletes by user — so
 *   refresh then too.
 * Only refreshes what's mounted (React Query's invalidation), and the
 * screens read small pre-summed queries, so this stays cheap.
 */
export function useLedgerRealtime(userId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
        qc.invalidateQueries({ queryKey: queryKeys.accounts.all });
        qc.invalidateQueries({ queryKey: queryKeys.peers.all });
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`ledger:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      // An invite of mine accepted / a link removed by the other person.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'peer_links', filter: `inviter_id=eq.${userId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'peer_links', filter: `invitee_id=eq.${userId}` },
        refresh,
      )
      .subscribe();

    let wasActive = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      if (active && !wasActive) refresh();
      wasActive = active;
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [userId, qc]);
}
