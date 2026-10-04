import { useFormError, useProfile, useUpdateProfile } from '@repo/core/hooks';
import type { Gender, Profile } from '@repo/core/types';
import { profileUpdateSchema } from '@repo/core/validators';
import { Button, ErrorCard, PageHeader, Screen, TextField } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { GenderField } from '../../../features/auth/gender-field';
import { DateField } from '../../../features/transactions/date-field';

/** Owns the form state — only ever mounted once `profile` is loaded (see
 * `EditProfile` below), so its `useState` seeds are never stale/empty from
 * racing the query. Same split as `GoalForm`/`CategoryForm`: the route does
 * the loading guard, the form component trusts what it's handed. */
function ProfileInfoForm({ profile }: { profile: Profile }) {
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
      birth_date: birthDate,
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
      onError: (e) => setError(e, 'No se pudieron guardar los cambios'),
    });
  };

  return (
    <View className="flex-1 gap-5">
      <TextField
        label="Nombre"
        placeholder="Ej. Ana García"
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

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          Fecha de nacimiento
        </Text>
        <DateField
          value={birthDate}
          onChange={(v) => {
            setBirthDate(v);
            clearError();
          }}
          showQuickChips={false}
          placeholder="Selecciona tu fecha de nacimiento"
        />
        {fieldErrors.birth_date ? (
          <Text className="text-xs text-danger dark:text-danger-dark">
            {fieldErrors.birth_date}
          </Text>
        ) : null}
      </View>

      <GenderField
        value={gender}
        onChange={(v) => {
          setGender(v);
          clearError();
        }}
        error={fieldErrors.gender}
      />

      <ErrorCard message={error} />

      <Button label="Guardar cambios" onPress={submit} loading={update.isPending} />
    </View>
  );
}

export default function EditProfile() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();

  return (
    <Screen edges={['top', 'bottom']} className="gap-5">
      <PageHeader title="Editar perfil" onBack={() => router.back()} />

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
