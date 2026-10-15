import {
  useAcceptPeerInvite,
  useAccountBalanceEffects,
  useAccounts,
  useCreatePeerInvite,
  useLinkedPeers,
  usePeerAccounts,
  useSetPeerReceiveAccount,
  useUnlinkPeer,
} from '@repo/core/hooks';
import type { LinkedPeer } from '@repo/core/supabase';
import { balancesFromEffects, formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import {
  BottomSheet,
  Button,
  ConfirmSheet,
  ErrorCard,
  ICON_COLORS,
  PageHeader,
  Screen,
  TextField,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import { Share2, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';

import { AccountPicker } from '../../../../../features/accounts/account-picker';

/**
 * Opciones › Personas: link with someone (a partner, a roommate) to send
 * each other transfers. A transfer sent to a linked person leaves your
 * account without counting as an expense, and lands in theirs — on its own,
 * without counting as income. Each person keeps their own accounts.
 */
export default function PeersScreen() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { data: peers } = useLinkedPeers();
  const { data: peerAccounts } = usePeerAccounts();
  const { data: accounts } = useAccounts();
  const { data: effects } = useAccountBalanceEffects();
  const createInvite = useCreatePeerInvite();
  const acceptInvite = useAcceptPeerInvite();
  const setReceive = useSetPeerReceiveAccount();
  const unlink = useUnlinkPeer();

  const [error, setError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joinAccountId, setJoinAccountId] = useState<string | null>(null);
  const [joinPickerOpen, setJoinPickerOpen] = useState(false);
  // Which person's receiving account is being picked.
  const [receiveFor, setReceiveFor] = useState<string | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedPeer | null>(null);

  const linked = (peers ?? []).filter((p) => p.status === 'accepted' && p.peerId);
  const myInvite = (peers ?? []).find((p) => p.status === 'pending' && p.isInviter) ?? null;
  const accountName = (id: string | null) =>
    (accounts ?? []).find((a) => a.id === id)?.name ?? null;
  const contactBalances = useMemo(
    () => balancesFromEffects(peerAccounts ?? [], effects ?? []),
    [peerAccounts, effects],
  );

  const share = (inviteCode: string) =>
    Share.share({
      message: `Vinculémonos en Finance Tracker para pasarnos dinero sin que cuente como gasto ni ingreso. Abre Opciones › Personas › "Tengo un código" y escribe: ${inviteCode}`,
    }).catch(() => {});

  const invite = () => {
    setError(null);
    createInvite.mutate(undefined, {
      onSuccess: (newCode) => share(newCode),
      onError: (e) => setError(toFriendlyMessage(e, 'No se pudo crear la invitación')),
    });
  };

  const join = () => {
    setError(null);
    if (code.trim().length !== 6) return setError('El código tiene 6 caracteres.');
    if (!joinAccountId) return setError('Elige la cuenta donde vas a recibir.');
    acceptInvite.mutate(
      { code: code.trim(), receiveAccountId: joinAccountId },
      {
        onSuccess: () => {
          setJoinOpen(false);
          setCode('');
          setJoinAccountId(null);
        },
        onError: (e) => setError(toFriendlyMessage(e, 'No se pudo usar el código')),
      },
    );
  };

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title="Personas" onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5"
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
          Vincúlate con tu pareja o con quien compartas gastos para pasarse dinero. Lo que le envías
          sale de tu cuenta sin contar como gasto, y le llega a su cuenta sola, sin contar como
          ingreso. Cada quien sigue llevando sus propias cuentas.
        </Text>

        <ErrorCard message={error} />

        {linked.map((p) => {
          const contacts = (peerAccounts ?? []).filter((a) => a.peer_user_id === p.peerId);
          return (
            <View key={p.linkId} className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                  <UserRound size={20} color={ICON_COLORS.limeInk} />
                </View>
                <Text className="flex-1 text-base font-bold text-ink dark:text-ink-dark">
                  {p.peerName ?? 'Persona'}
                </Text>
              </View>

              <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                {p.receiveCurrencies.length > 0
                  ? `Puede recibir en ${p.receiveCurrencies.join(', ')}`
                  : 'Aún no eligió dónde recibir: no le puedes enviar todavía'}
              </Text>

              {/* The contact account's balance is the net sent between you. */}
              {contacts.map((a) => {
                const net = contactBalances.get(a.id) ?? 0;
                if (Math.round(net * 100) === 0) return null;
                return (
                  <Text key={a.id} className="text-sm text-ink-2 dark:text-ink-2-dark">
                    {net > 0
                      ? `Le has enviado ${formatCurrency(net, a.currency)} más de lo que te ha enviado`
                      : `Te ha enviado ${formatCurrency(-net, a.currency)} más de lo que le has enviado`}
                  </Text>
                );
              })}

              <View className="gap-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
                  Recibes en
                </Text>
                {contacts
                  .filter((a) => a.receive_into_account_id)
                  .map((a) => (
                    <Text key={a.id} className="text-sm text-ink dark:text-ink-dark">
                      {accountName(a.receive_into_account_id) ?? 'Cuenta archivada'} · {a.currency}
                    </Text>
                  ))}
                <Pressable onPress={() => setReceiveFor(p.peerId)} hitSlop={6}>
                  <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                    {contacts.some((a) => a.receive_into_account_id)
                      ? 'Cambiar o agregar otra divisa ›'
                      : 'Elige dónde recibir ›'}
                  </Text>
                </Pressable>
              </View>

              <Pressable onPress={() => setUnlinkTarget(p)} hitSlop={6} className="self-start">
                <Text className="text-[13px] font-semibold text-danger dark:text-danger-dark">
                  Desvincular
                </Text>
              </Pressable>
            </View>
          );
        })}

        {myInvite?.code ? (
          <View className="gap-2 rounded-card border border-dashed border-line p-5 dark:border-line-dark">
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
              Tu código de invitación (vence en 7 días)
            </Text>
            <Text className="text-3xl font-bold tracking-[6px] text-ink dark:text-ink-dark">
              {myInvite.code}
            </Text>
            <Pressable
              onPress={() => share(myInvite.code!)}
              className="flex-row items-center gap-1.5 self-start"
              hitSlop={6}
            >
              <Share2 size={14} color={ICON_COLORS.limeInk} />
              <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                Compartir
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="gap-3">
          <Button
            label={myInvite ? 'Crear otro código' : 'Invitar a alguien'}
            onPress={invite}
            loading={createInvite.isPending}
          />
          <Button label="Tengo un código" variant="secondary" onPress={() => setJoinOpen(true)} />
        </View>
      </ScrollView>

      <BottomSheet visible={joinOpen} onClose={() => setJoinOpen(false)} title="Usar un código">
        <View className="gap-4 px-5 pb-6 pt-1">
          <TextField
            label="Código"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="Ej. K7P2QX"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <Pressable
            onPress={() => setJoinPickerOpen(true)}
            className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
          >
            <Text
              className={
                joinAccountId
                  ? 'text-base text-ink dark:text-ink-dark'
                  : 'text-base text-ink-3 dark:text-ink-3-dark'
              }
            >
              {accountName(joinAccountId) ?? '¿En qué cuenta recibes?'}
            </Text>
            <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
              Elegir ›
            </Text>
          </Pressable>
          <ErrorCard message={error} />
          <Button label="Vincular" onPress={join} loading={acceptInvite.isPending} />
        </View>
      </BottomSheet>

      <AccountPicker
        visible={joinPickerOpen}
        onClose={() => setJoinPickerOpen(false)}
        title="¿En qué cuenta recibes?"
        selectedId={joinAccountId}
        onSelect={setJoinAccountId}
      />

      <AccountPicker
        visible={receiveFor != null}
        onClose={() => setReceiveFor(null)}
        title="¿En qué cuenta recibes?"
        selectedId={null}
        onSelect={(accountId) => {
          if (!receiveFor) return;
          setError(null);
          setReceive.mutate(
            { peerId: receiveFor, accountId },
            { onError: (e) => setError(toFriendlyMessage(e, 'No se pudo guardar')) },
          );
        }}
      />

      <ConfirmSheet
        visible={unlinkTarget != null}
        title={`¿Desvincularte de ${unlinkTarget?.peerName ?? 'esta persona'}?`}
        description="Ya no podrán enviarse transferencias. Las que ya se hicieron se conservan en las cuentas de los dos."
        confirmLabel="Desvincular"
        destructive
        onCancel={() => setUnlinkTarget(null)}
        onConfirm={() => {
          if (unlinkTarget) unlink.mutate(unlinkTarget.linkId);
          setUnlinkTarget(null);
        }}
      />
    </Screen>
  );
}
