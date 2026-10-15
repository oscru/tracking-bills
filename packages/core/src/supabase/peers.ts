import { supabase } from './client';
import { SupabaseError, unwrap } from './internal';

/**
 * Linked people: two users who can send each other transfers. Each side
 * keeps their own ledger — the database mirrors a transfer sent to a
 * person into theirs (see `20261014160000_peer_transfers.sql`).
 */
export interface LinkedPeer {
  linkId: string;
  /** Null while the invite hasn't been redeemed. */
  peerId: string | null;
  peerName: string | null;
  status: 'pending' | 'accepted';
  /** Only for invites the user created. */
  code: string | null;
  expiresAt: string;
  isInviter: boolean;
  /** Currencies this person can receive in (they have an active account set for it). */
  receiveCurrencies: string[];
}

export async function listLinkedPeers(): Promise<LinkedPeer[]> {
  const rows = unwrap(await supabase.rpc('linked_peers'));
  return rows.map((r) => ({
    linkId: r.link_id,
    peerId: r.peer_id,
    peerName: r.peer_name,
    status: r.status === 'accepted' ? 'accepted' : 'pending',
    code: r.code,
    expiresAt: r.expires_at,
    isInviter: r.is_inviter,
    receiveCurrencies: r.receive_currencies ?? [],
  }));
}

/** A fresh invite code (replaces any pending one of the user's). */
export async function createPeerInvite(): Promise<string> {
  return unwrap(await supabase.rpc('create_peer_invite'));
}

/** Redeems `code`; money from the inviter will land in `receiveAccountId`. Returns the inviter's id. */
export async function acceptPeerInvite(code: string, receiveAccountId: string): Promise<string> {
  return unwrap(
    await supabase.rpc('accept_peer_invite', {
      p_code: code,
      p_receive_account_id: receiveAccountId,
    }),
  );
}

/** Where money from `peerId` lands, for that account's currency. */
export async function setPeerReceiveAccount(peerId: string, accountId: string): Promise<void> {
  const { error } = await supabase.rpc('set_peer_receive_account', {
    p_peer: peerId,
    p_account_id: accountId,
  });
  if (error) throw new SupabaseError(error);
}

/** The user's contact account for `peerId` in `currency` (created on first use) — a transfer's destination to send them money. */
export async function peerContactAccount(peerId: string, currency: string): Promise<string> {
  return unwrap(
    await supabase.rpc('peer_contact_account', { p_peer: peerId, p_currency: currency }),
  );
}

export async function unlinkPeer(linkId: string): Promise<void> {
  const { error } = await supabase.rpc('unlink_peer', { p_link_id: linkId });
  if (error) throw new SupabaseError(error);
}
