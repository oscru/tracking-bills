import { Ionicons } from '@expo/vector-icons';
import {
  useAccounts,
  useBudgets,
  useCreateTag,
  useGoals,
  useProfile,
  useTags,
  useUpdateProfile,
  useUpdateTag,
} from '@repo/core/hooks';
import type { Profile, Tag, ThemePreference } from '@repo/core/types';
import { findCurrency, toFriendlyMessage, type CurrencyMeta } from '@repo/core/utils';
import { BottomSheet, Button, ErrorCard, PageHeader, Screen, SwitchRow, TextField } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { CurrencyMultiPicker, CurrencyPicker } from '../../../../features/settings/currency-picker';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: tags, isLoading: tagsLoading } = useTags();

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title="Preferencias" onBack={() => router.back()} />

      {isLoading || !profile || tagsLoading || !tags ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <>
          <EnabledCurrenciesSection profile={profile} />
          <CurrencySection profile={profile} />
          <ThemeSection value={profile.theme_preference} />
          <TravelModeSection profile={profile} tags={tags} />

          <View className="gap-2 rounded-2xl border border-line px-4 py-4 dark:border-line-dark">
            <Text className="text-sm font-medium text-ink dark:text-ink-dark">Idioma</Text>
            <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
              Por ahora la app solo está disponible en español.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

function CurrencySection({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = findCurrency(profile.currency);

  const pick = (c: CurrencyMeta) => {
    if (c.code !== profile.currency) updateProfile.mutate({ currency: c.code });
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Moneda por defecto</Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Text className="text-[15px] font-medium capitalize text-ink dark:text-ink-dark">
          {meta ? `${meta.symbol} · ${meta.name} (${meta.code})` : profile.currency}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>
      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        Se preselecciona al crear una cuenta, presupuesto u objetivo nuevo — cada uno conserva su
        propia divisa después, no se mezclan en un solo total.
      </Text>

      <CurrencyPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedCode={profile.currency}
        onSelect={pick}
        codes={profile.enabled_currencies}
      />
    </View>
  );
}

function EnabledCurrenciesSection({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const { data: accounts } = useAccounts();
  const { data: budgets } = useBudgets();
  const { data: goals } = useGoals();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const codes = profile.enabled_currencies;

  // A currency still backing an existing account/budget/goal can't be
  // disabled — `enabled_currencies` only curates what's offered for NEW
  // things, so turning one off while it's in use wouldn't remove it from
  // anywhere, it would just stop explaining why that account/budget/goal's
  // currency no longer shows up as pickable elsewhere.
  const inUseCodes = Array.from(
    new Set([
      ...(accounts ?? []).map((a) => a.currency),
      ...(budgets ?? []).map((b) => b.currency),
      ...(goals ?? []).map((g) => g.currency),
    ]),
  );

  const toggle = (code: string) => {
    const has = codes.includes(code);
    if (has && codes.length <= 1) return;
    if (has && inUseCodes.includes(code)) {
      setBlockedMessage(
        `No puedes deshabilitar ${code}: todavía tienes cuentas, presupuestos o metas en esa divisa.`,
      );
      return;
    }
    setBlockedMessage(null);
    const next = has ? codes.filter((c) => c !== code) : [...codes, code];
    // Dropping the current default picks the first remaining one instead —
    // there must always be a valid preselected currency to fall back on.
    const nextDefault = has && profile.currency === code ? next[0]! : profile.currency;
    updateProfile.mutate(
      { enabled_currencies: next, currency: nextDefault },
      {
        // Defense in depth: the UI already locks in-use currencies in the
        // picker, but a concurrent edit from another device (a new account
        // created in the gap between loading this list and tapping toggle)
        // could still make the DB-level check the one that actually catches it.
        onError: (e) => setBlockedMessage(toFriendlyMessage(e, 'No se pudo actualizar')),
      },
    );
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Divisas habilitadas</Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Text
          className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark"
          numberOfLines={1}
        >
          {codes.join(' · ')}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </Pressable>
      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        Como elegir idiomas en un traductor: busca y marca las que realmente usas — son las únicas
        que vas a poder elegir al crear una cuenta, un presupuesto o un objetivo.
      </Text>
      <ErrorCard message={blockedMessage} />

      <CurrencyMultiPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedCodes={codes}
        onToggle={toggle}
        inUseCodes={inUseCodes}
      />
    </View>
  );
}

function TravelModeSection({ profile, tags }: { profile: Profile; tags: Tag[] }) {
  const updateProfile = useUpdateProfile();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const tripTag = tags.find((t) => t.id === profile.travel_trip_tag_id) ?? null;

  // Only asked for a trip name the first time — once a trip tag exists it's
  // just renamed in place, never recreated, so past movements keep pointing
  // at the same tag. `tripName` seeds from `tripTag` at mount only (this
  // screen already waits on both profile and tags before rendering), then
  // lives independently so typing doesn't fight a refetch.
  const [namingTrip, setNamingTrip] = useState(false);
  const [tripName, setTripName] = useState(tripTag?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  // The trip tag can vanish out from under an active toggle — deleted from
  // the Tags screen while travel mode was on. Re-ask for a name instead of
  // silently tagging nothing.
  const showNaming = namingTrip || (profile.travel_mode && !tripTag);

  const toggle = (on: boolean) => {
    setError(null);
    if (!on) return updateProfile.mutate({ travel_mode: false });
    if (tripTag) return updateProfile.mutate({ travel_mode: true });
    setTripName('');
    setNamingTrip(true);
  };

  const confirmTripName = () => {
    const name = tripName.trim();
    if (!name) return;
    setError(null);
    createTag.mutate(
      { name },
      {
        onSuccess: (tag) => {
          setNamingTrip(false);
          updateProfile.mutate({ travel_mode: true, travel_trip_tag_id: tag.id });
        },
        onError: (e) => setError(toFriendlyMessage(e, 'No se pudo crear la tag del viaje')),
      },
    );
  };

  const renameTrip = () => {
    const name = tripName.trim();
    if (!tripTag || !name || name === tripTag.name) return;
    updateTag.mutate({ id: tripTag.id, patch: { name } });
  };

  return (
    <View className="gap-2">
      <SwitchRow
        label="Modo viaje"
        description="Mientras esté activo, cada gasto, ingreso y transferencia que registres se etiqueta automáticamente con la tag de tu viaje, para que puedas verlos todos juntos después."
        value={profile.travel_mode}
        onValueChange={toggle}
      />

      {showNaming ? (
        <View className="gap-2 rounded-ctl border border-line bg-surface p-3.5 dark:border-line-dark dark:bg-surface-dark">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark">
            ¿Cómo se llama tu viaje?
          </Text>
          <TextField
            placeholder="Ej. Viaje a Cancún"
            value={tripName}
            onChangeText={setTripName}
            autoFocus
          />
          <ErrorCard message={error} />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => {
                  setNamingTrip(false);
                  if (profile.travel_mode && !tripTag) updateProfile.mutate({ travel_mode: false });
                }}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Activar"
                onPress={confirmTripName}
                loading={createTag.isPending}
                disabled={!tripName.trim()}
              />
            </View>
          </View>
        </View>
      ) : tripTag ? (
        <View className="gap-1.5">
          <TextField
            label="Nombre del viaje"
            value={tripName}
            onChangeText={setTripName}
            onBlur={renameTrip}
            placeholder="Nombre del viaje"
          />
          {profile.travel_mode ? (
            <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
              Viaje activo: tus movimientos nuevos se están etiquetando con “{tripTag.name}”.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ThemeSection({ value }: { value: ThemePreference }) {
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = THEME_OPTIONS.find((o) => o.value === value) ?? THEME_OPTIONS[0]!;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tema</Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <View className="flex-row items-center gap-2.5">
          <Ionicons name={selected.icon} size={18} color="#4D7C0F" />
          <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
            {selected.label}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </Pressable>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Tema">
        <View className="pb-4">
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                updateProfile.mutate({ theme_preference: opt.value });
                setPickerOpen(false);
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                <Ionicons name={opt.icon} size={16} color="#4D7C0F" />
              </View>
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {opt.label}
              </Text>
              {value === opt.value ? (
                <Ionicons name="checkmark" size={18} color="#4D7C0F" />
              ) : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
