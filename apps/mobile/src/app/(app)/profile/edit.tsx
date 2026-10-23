import { translateMessage } from '@repo/core/i18n';
import { useFormError, useProfile, useUpdateProfile } from '@repo/core/hooks';
import type { Gender, Profile } from '@repo/core/types';
import { profileUpdateSchema } from '@repo/core/validators';
import { Button, ErrorCard, PageHeader, Screen, TextField } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GenderField } from '../../../features/auth/gender-field';
import { LegalLink } from '../../../features/legal/legal';
import { DateField } from '../../../features/transactions/date-field';

/** Owns the form state — only ever mounted once `profile` is loaded (see
 * `EditProfile` below), so its `useState` seeds are never stale/empty from
 * racing the query. Same split as `GoalForm`/`CategoryForm`: the route does
 * the loading guard, the form component trusts what it's handed. */
function ProfileInfoForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation(['profile', 'common']);
  const router = useRouter();
  const update = useUpdateProfile();
  const { error, setError, clearError } = useFormError();

  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '');
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [fieldErrors, setFieldErrors] = useState<{
    full_name?: string;
    birth_date?: string;
    gender?: string;
  }>({});

  const submit = () => {
    clearError();
    setFieldErrors({});
    const parsed = profileUpdateSchema.safeParse({
      full_name: fullName,
      // Empty = delete it (both are optional).
      birth_date: birthDate || null,
      gender,
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        full_name: f.full_name?.[0],
        birth_date: f.birth_date?.[0],
        gender: f.gender?.[0],
      });
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (e) => setError(e, t('common:saveChangesFailed')),
    });
  };

  return (
    <View className="flex-1 gap-5">
      <TextField
        label={t('name')}
        placeholder={t('namePlaceholder')}
        value={fullName}
        onChangeText={(v) => {
          setFullName(v);
          clearError();
        }}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        error={fieldErrors.full_name}
      />

      {/* Optional, and only for aggregate statistics — the Aviso de
      privacidad says so; deleting them is one tap. */}
      <View className="gap-1 rounded-2xl bg-surface p-4 dark:bg-surface-dark">
        <Text className="text-[13px] font-bold uppercase tracking-wider text-ink-3 dark:text-ink-3-dark">
          {t('optional')}
        </Text>
        <Text className="text-[13px] leading-5 text-ink-2 dark:text-ink-2-dark">
          <Trans
            t={t}
            i18nKey="optionalNote"
            components={{ privacy: <LegalLink doc="privacy" /> }}
          />
        </Text>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
            {t('birthDate')}
          </Text>
          {birthDate ? (
            <Pressable onPress={() => setBirthDate('')} hitSlop={8} accessibilityRole="button">
              <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
                {t('clear')}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <DateField
          value={birthDate}
          onChange={(v) => {
            setBirthDate(v);
            clearError();
          }}
          showQuickChips={false}
          placeholder={t('optional')}
        />
        {fieldErrors.birth_date ? (
          <Text className="text-xs text-danger dark:text-danger-dark">
            {translateMessage(fieldErrors.birth_date)}
          </Text>
        ) : null}
      </View>

      <View className="gap-1.5">
        <GenderField
          value={gender}
          onChange={(v) => {
            setGender(v);
            clearError();
          }}
          error={fieldErrors.gender}
        />
        {gender ? (
          <Pressable
            onPress={() => setGender(null)}
            hitSlop={8}
            accessibilityRole="button"
            className="self-end"
          >
            <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
              {t('clearGender')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ErrorCard message={error} />

      <Button label={t('common:saveChanges')} onPress={submit} loading={update.isPending} />
    </View>
  );
}

export default function EditProfile() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();

  return (
    <Screen edges={['top', 'bottom']} className="gap-5">
      <PageHeader title={t('edit')} onBack={() => router.back()} />

      {isLoading || !profile ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ProfileInfoForm profile={profile} />
      )}
    </Screen>
  );
}
