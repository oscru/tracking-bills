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
import { i18n, isLanguage, type Language } from '@repo/core/i18n';
import type { Profile, Tag, ThemePreference } from '@repo/core/types';
import { currencyName, findCurrency, toFriendlyMessage, type CurrencyMeta } from '@repo/core/utils';
import {
  BottomSheet,
  Button,
  ErrorCard,
  PageHeader,
  Screen,
  SwitchRow,
  TextField,
  ICON_COLORS,
  useTabBarScrollPadding,
} from '@repo/ui';
import { useRouter } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Languages,
  Moon,
  Smartphone,
  Sun,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View, ScrollView } from 'react-native';

import { CurrencyMultiPicker, CurrencyPicker } from '../../../../features/settings/currency-picker';
import { deviceLanguage } from '../../../../features/settings/language-sync';
import { switchColorScheme } from '../../../../features/settings/theme-sync';

const THEME_OPTIONS: {
  value: ThemePreference;
  icon: LucideIcon;
}[] = [
  { value: 'system', icon: Smartphone },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

export default function PreferencesScreen() {
  const { t } = useTranslation('preferences');
  const scrollPadding = useTabBarScrollPadding();
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: tags, isLoading: tagsLoading } = useTags();

  return (
    <Screen edges={['top']} className="gap-6">
      <PageHeader title={t('title')} onBack={() => router.back()} />

      {isLoading || !profile || tagsLoading || !tags ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: scrollPadding }}
          showsVerticalScrollIndicator={false}
        >
          <EnabledCurrenciesSection profile={profile} />
          <CurrencySection profile={profile} />
          <ThemeSection value={profile.theme_preference} />
          <TravelModeSection profile={profile} tags={tags} />

          <LanguageSection value={profile.language} />
        </ScrollView>
      )}
    </Screen>
  );
}

function CurrencySection({ profile }: { profile: Profile }) {
  const { t } = useTranslation(['preferences', 'common']);
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = findCurrency(profile.currency);

  const pick = (c: CurrencyMeta) => {
    if (c.code !== profile.currency) updateProfile.mutate({ currency: c.code });
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
        {t('currency.title')}
      </Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <Text className="text-[15px] font-medium capitalize text-ink dark:text-ink-dark">
          {meta ? `${meta.symbol} · ${currencyName(meta)} (${meta.code})` : profile.currency}
        </Text>
        <ChevronDown size={18} color={ICON_COLORS.ink3} />
      </Pressable>
      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        {t('currency.hint')}
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
  const { t } = useTranslation(['preferences', 'common']);
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
      setBlockedMessage(t('enabled.inUse', { code }));
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
        onError: (e) => setBlockedMessage(toFriendlyMessage(e, t('enabled.updateFailed'))),
      },
    );
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
        {t('enabled.title')}
      </Text>
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
        <ChevronRight size={18} color={ICON_COLORS.ink3} />
      </Pressable>
      <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
        {t('enabled.hint')}
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
  const { t } = useTranslation(['preferences', 'common']);
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
        onError: (e) => setError(toFriendlyMessage(e, t('travel.createFailed'))),
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
        label={t('travel.title')}
        description={t('travel.hint')}
        value={profile.travel_mode}
        onValueChange={toggle}
      />

      {showNaming ? (
        <View className="gap-2 rounded-ctl border border-line bg-surface p-3.5 dark:border-line-dark dark:bg-surface-dark">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark">
            {t('travel.nameQuestion')}
          </Text>
          <TextField
            placeholder={t('travel.namePlaceholder')}
            value={tripName}
            onChangeText={setTripName}
            autoFocus
          />
          <ErrorCard message={error} />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={t('common:cancel')}
                variant="secondary"
                onPress={() => {
                  setNamingTrip(false);
                  if (profile.travel_mode && !tripTag) updateProfile.mutate({ travel_mode: false });
                }}
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('travel.activate')}
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
            label={t('travel.name')}
            value={tripName}
            onChangeText={setTripName}
            onBlur={renameTrip}
            placeholder={t('travel.name')}
          />
          {profile.travel_mode ? (
            <Text className="text-[13px] leading-[18px] text-ink-2 dark:text-ink-2-dark">
              {t('travel.active', { name: tripTag.name })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ThemeSection({ value }: { value: ThemePreference }) {
  const { t } = useTranslation(['preferences', 'common']);
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected = THEME_OPTIONS.find((o) => o.value === value) ?? THEME_OPTIONS[0]!;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
        {t('theme.title')}
      </Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <View className="flex-row items-center gap-2.5">
          <selected.icon size={18} color={ICON_COLORS.limeInk} />
          <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
            {t(`theme.${selected.value}`)}
          </Text>
        </View>
        <ChevronDown size={18} color={ICON_COLORS.ink3} />
      </Pressable>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('theme.title')}
      >
        <View className="pb-4">
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={(e) => {
                setPickerOpen(false);
                if (opt.value === value) return;
                // Switch now (with the reveal on web) instead of waiting for
                // the saved profile to come back through `ThemeSync`.
                switchColorScheme(opt.value, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
                updateProfile.mutate(
                  { theme_preference: opt.value },
                  { onError: () => switchColorScheme(value) },
                );
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark">
                <opt.icon size={16} color={ICON_COLORS.limeInk} />
              </View>
              <Text className="flex-1 text-[15px] font-medium text-ink dark:text-ink-dark">
                {t(`theme.${opt.value}`)}
              </Text>
              {value === opt.value ? <Check size={18} color={ICON_COLORS.limeInk} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const LANGUAGE_OPTIONS: (Language | null)[] = [null, 'es', 'en'];

/** Interface language: Automático (the device's — `null`), Español or English. */
function LanguageSection({ value }: { value: string | null }) {
  const { t } = useTranslation('preferences');
  const updateProfile = useUpdateProfile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const chosen = isLanguage(value) ? value : null;
  const label = (option: Language | null) => t(option ? `language.${option}` : 'language.system');

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
        {t('language.title')}
      </Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
      >
        <View className="flex-row items-center gap-2.5">
          <Languages size={18} color={ICON_COLORS.limeInk} />
          <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
            {label(chosen)}
          </Text>
        </View>
        <ChevronDown size={18} color={ICON_COLORS.ink3} />
      </Pressable>

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('language.title')}
      >
        <View className="pb-4">
          {LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option ?? 'system'}
              onPress={() => {
                setPickerOpen(false);
                if (option === chosen) return;
                // Switch now instead of waiting for the saved profile to come
                // back through `LanguageEffects`.
                void i18n.changeLanguage(option ?? deviceLanguage());
                updateProfile.mutate(
                  { language: option },
                  { onError: () => void i18n.changeLanguage(chosen ?? deviceLanguage()) },
                );
              }}
              className="flex-row items-center gap-3 border-t border-line px-5 py-3.5 dark:border-line-dark"
            >
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
                  {label(option)}
                </Text>
                {option === null ? (
                  <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
                    {t('language.systemHint')}
                  </Text>
                ) : null}
              </View>
              {chosen === option ? <Check size={18} color={ICON_COLORS.limeInk} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
