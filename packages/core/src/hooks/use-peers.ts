import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptPeerInvite,
  createPeerInvite,
  listLinkedPeers,
  listPeerAccounts,
  peerContactAccount,
  setPeerReceiveAccount,
  unlinkPeer,
} from '../supabase';
import { queryKeys } from './keys';

/** The user's linked people, plus their own pending invite (if any). */
export function useLinkedPeers() {
  return useQuery({ queryKey: queryKeys.peers.list(), queryFn: listLinkedPeers });
}

/** Contact accounts (one per linked person and currency) — their balance is the net sent between you. */
export function usePeerAccounts() {
  return useQuery({ queryKey: queryKeys.accounts.peers(), queryFn: listPeerAccounts });
}

function useInvalidatePeers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.peers.all });
    qc.invalidateQueries({ queryKey: queryKeys.accounts.peers() });
  };
}

export function useCreatePeerInvite() {
  const invalidate = useInvalidatePeers();
  return useMutation({ mutationFn: createPeerInvite, onSuccess: invalidate });
}

export function useAcceptPeerInvite() {
  const invalidate = useInvalidatePeers();
  return useMutation({
    mutationFn: ({ code, receiveAccountId }: { code: string; receiveAccountId: string }) =>
      acceptPeerInvite(code, receiveAccountId),
    onSuccess: invalidate,
  });
}

export function useSetPeerReceiveAccount() {
  const invalidate = useInvalidatePeers();
  return useMutation({
    mutationFn: ({ peerId, accountId }: { peerId: string; accountId: string }) =>
      setPeerReceiveAccount(peerId, accountId),
    onSuccess: invalidate,
  });
}

/** Resolves (creating on first use) the contact account to send `peerId` money in `currency`. */
export function usePeerContactAccount() {
  const invalidate = useInvalidatePeers();
  return useMutation({
    mutationFn: ({ peerId, currency }: { peerId: string; currency: string }) =>
      peerContactAccount(peerId, currency),
    onSuccess: invalidate,
  });
}

export function useUnlinkPeer() {
  const invalidate = useInvalidatePeers();
  return useMutation({ mutationFn: unlinkPeer, onSuccess: invalidate });
}
