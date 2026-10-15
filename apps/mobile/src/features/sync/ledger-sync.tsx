import { useLedgerRealtime, useSession } from '@repo/core/hooks';

/**
 * Mounted once inside the signed-in app (like `NotificationSync`): keeps the
 * cached ledger live — transfers a linked person sends show up without a
 * reload (see `useLedgerRealtime`). Renders nothing.
 */
export function LedgerSync() {
  const { session } = useSession();
  useLedgerRealtime(session?.user.id ?? null);
  return null;
}
