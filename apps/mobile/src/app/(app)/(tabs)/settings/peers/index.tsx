import { useAcceptPeerInvite, useAccounts, useCreatePeerInvite } from '@repo/core/hooks';
import { formatCurrency, toFriendlyMessage } from '@repo/core/utils';
import {
  BottomSheet,
  Button,
  EmptyState,
  ErrorCard,
  ICON_COLORS,
  PageHeader,
  PeersEmptyIllustration,
  Screen,
  SegmentedControl,
  StaggerItem,
  TextField,
  useTabBarScrollPadding,
} from '@repo/ui';
import * as Clipboard from 'expo-clipboard';
import { useGlobalSearchParams, useRouter, type Href } from 'expo-router';
import { Check, Copy, Share2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { AccountPicker } from '../../../../../features/accounts/account-picker';
import { PersonAvatar, netLabel } from '../../../../../features/peers/person-ui';
import { usePeople, type Person } from '../../../../../features/peers/use-people';
import {
  MasterDetailEmpty,
  useInListPane,
  useMasterDetailPanes,
} from '../../../../../features/settings/master-detail';

type Tab = 'people' | 'link';
const TABS: { value: Tab; label: string }[] = [
  { value: 'people', label: 'Tus personas' },
  { value: 'link', label: 'Vincular' },
];

const STEPS = [
  'Crea un código y compártelo con la otra persona.',
  'Ella lo escribe en «Tengo un código» y elige en qué cuenta recibe.',
  'Listo: pásense dinero sin que cuente como gasto ni como ingreso.',
];

/** One person, all their currencies on one card — tap for the detail. */
function PersonCard({
  person,
  selected,
  onPress,
}: {
  person: Person;
  selected: boolean;
  onPress: () => void;
}) {
  const nets = [...person.net.entries()];
  const shown = nets.slice(0, 2);
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-card p-4 active:opacity-70 ${
        selected ? 'bg-lime-tint dark:bg-lime-tint-dark' : 'bg-surface dark:bg-surface-dark'
      }`}
    >
      <PersonAvatar name={person.name} muted={!person.link} />
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
          {person.name}
        </Text>
        <Text className="text-xs text-ink-2 dark:text-ink-2-dark" numberOfLines={1}>
          {person.accounts.length === 0
            ? 'Sin transferencias todavía'
            : person.accounts.map((a) => a.currency).join(' · ')}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        {shown.map(([currency, net]) => (
          <Text
            key={currency}
            className="text-[13px] font-semibold text-ink dark:text-ink-dark"
            numberOfLines={1}
          >
            {Math.round(net * 100) === 0 ? 'Parejos' : formatCurrency(Math.abs(net), currency)}
          </Text>
        ))}
        {shown.length > 0 ? (
          <Text className="text-[11px] text-ink-3 dark:text-ink-3-dark">
            {nets.length > 2 ? `+${nets.length - 2} más` : netLabel(shown[0]![1])}
          </Text>
        ) : null}
      </View>
      <Text className="text-lg text-ink-3 dark:text-ink-3-dark">›</Text>
    </Pressable>
  );
}

/**
 * Opciones › Personas: the people you're linked with (a partner, a
 * roommate) to send each other transfers — a transfer sent to a linked
 * person leaves your account without counting as an expense, and lands in
 * theirs on its own, without counting as income. Two tabs: your people
 * (each grouping all their accounts) and linking someone new. On desktop,
 * also the list beside the open person (see `_layout`).
 */
export function PeersList() {
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const inPane = useInListPane();
  const { peerId: selectedId } = useGlobalSearchParams<{ peerId?: string }>();
  const { people, myInvite, isLoading } = usePeople();
  const { data: accounts } = useAccounts();
  const createInvite = useCreatePeerInvite();
  const acceptInvite = useAcceptPeerInvite();

  const [tab, setTab] = useState<Tab>('people');
  const [error, setError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joinAccountId, setJoinAccountId] = useState<string | null>(null);
  const [joinPickerOpen, setJoinPickerOpen] = useState(false);

  const linked = people.filter((p) => p.link);
  const unlinked = people.filter((p) => !p.link);
  const accountName = (id: string | null) =>
    (accounts ?? []).find((a) => a.id === id)?.name ?? null;

  const share = (inviteCode: string) =>
    Share.share({
      message: `Vinculémonos en Genobills para pasarnos dinero sin que cuente como gasto ni ingreso. Abre Opciones › Personas › Vincular › "Tengo un código" y escribe: ${inviteCode}`,
    }).catch(() => {});

  // "Copiado" for a moment after copying the code, then back to "Copiar".
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(copyTimer.current ?? undefined), []);
  const copy = (inviteCode: string) => {
    Clipboard.setStringAsync(inviteCode)
      .then(() => {
        setCopied(true);
        clearTimeout(copyTimer.current ?? undefined);
        copyTimer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError('No se pudo copiar el código.'));
  };

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
          setTab('people');
        },
        onError: (e) => setError(toFriendlyMessage(e, 'No se pudo usar el código')),
      },
    );
  };

  const openPerson = (peerId: string) =>
    router.push({ pathname: '/(app)/settings/peers/[peerId]', params: { peerId } } as Href);

  const section = (title: string, list: Person[], offset: number) =>
    list.length > 0 ? (
      <View className="gap-2">
        <Text className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-3 dark:text-ink-3-dark">
          {title}
        </Text>
        {list.map((person, i) => (
          <StaggerItem key={person.peerId} index={offset + i}>
            <PersonCard
              person={person}
              selected={inPane && selectedId === person.peerId}
              onPress={() => openPerson(person.peerId)}
            />
          </StaggerItem>
        ))}
      </View>
    ) : null;

  const peopleTab = isLoading ? (
    <ActivityIndicator className="mt-8" />
  ) : people.length === 0 ? (
    <View className="flex-1 justify-center gap-5">
      <EmptyState
        className="flex-none"
        illustration={<PeersEmptyIllustration />}
        title="Aún no tienes personas vinculadas"
        description="Vincúlate con tu pareja o con quien compartas gastos para pasarse dinero sin que cuente como gasto ni ingreso."
      />
      <View className="self-center">
        <Button label="Vincular a alguien" onPress={() => setTab('link')} />
      </View>
    </View>
  ) : (
    <>
      {section('Vinculadas', linked, 0)}
      {section('Ya no vinculadas', unlinked, linked.length)}
    </>
  );

  const linkTab = (
    <>
      <View className="gap-3 rounded-card bg-surface p-5 dark:bg-surface-dark">
        <Text className="text-base font-bold text-ink dark:text-ink-dark">Cómo funciona</Text>
        {STEPS.map((step, i) => (
          <View key={step} className="flex-row items-start gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-lime">
              <Text className="text-xs font-bold text-ink">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-sm text-ink-2 dark:text-ink-2-dark">{step}</Text>
          </View>
        ))}
        {/* Exactly what linking shares — see `ensure_contact_account` /
        `linked_peers` in the peer_transfers migration. */}
        <Text className="text-xs leading-5 text-ink-3 dark:text-ink-3-dark">
          Cada quien sigue llevando sus propias cuentas. Al vincularse, cada persona ve el nombre de
          la otra (o, si no tiene, la parte de su correo antes de la @) y las transferencias entre
          ustedes; nada más de sus cuentas ni de sus movimientos. Puedes desvincularte cuando
          quieras.
        </Text>
      </View>

      {myInvite?.code ? (
        <View className="gap-2 rounded-card border border-dashed border-line p-5 dark:border-line-dark">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
            Tu código de invitación (vence en 7 días)
          </Text>
          <Text className="text-3xl font-bold tracking-[6px] text-ink dark:text-ink-dark">
            {myInvite.code}
          </Text>
          <View className="flex-row items-center gap-5">
            <Pressable
              onPress={() => copy(myInvite.code!)}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Código copiado' : 'Copiar código'}
              className="flex-row items-center gap-1.5"
              hitSlop={6}
            >
              {copied ? (
                <Check size={14} color={ICON_COLORS.limeInk} />
              ) : (
                <Copy size={14} color={ICON_COLORS.limeInk} />
              )}
              <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                {copied ? 'Copiado' : 'Copiar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => share(myInvite.code!)}
              className="flex-row items-center gap-1.5"
              hitSlop={6}
            >
              <Share2 size={14} color={ICON_COLORS.limeInk} />
              <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
                Compartir
              </Text>
            </Pressable>
          </View>
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
    </>
  );

  return (
    <Screen edges={['top']} className="gap-4">
      <PageHeader title="Personas" onBack={() => router.back()} />
      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="grow gap-5"
        contentContainerStyle={{ paddingBottom: scrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        <ErrorCard message={joinOpen ? null : error} />
        {tab === 'people' ? peopleTab : linkTab}
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
    </Screen>
  );
}

/**
 * The section's index route. Desktop: the list lives in the layout's left
 * pane, so this is the right pane's "nothing open yet" state. Phones: the
 * list itself.
 */
export default function PeersScreen() {
  const panes = useMasterDetailPanes();
  if (!panes) return <PeersList />;
  return (
    <MasterDetailEmpty
      illustration={<PeersEmptyIllustration />}
      title="Elige a una persona"
      description="Su balance, sus cuentas y el historial de lo que se han enviado aparecen aquí, junto a la lista."
    />
  );
}
