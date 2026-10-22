import { useFormError, useProfile, useUpdateProfile } from '@repo/core/hooks';
import type { Gender, Profile } from '@repo/core/types';
import { profileUpdateSchema } from '@repo/core/validators';
import { Button, ErrorCard, PageHeader, Screen, TextField } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { GenderField } from '../../../features/auth/gender-field';
import { LegalLink } from '../../../features/legal/legal';
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

      {/* Optional, and only for aggregate statistics — the Aviso de
      privacidad says so; deleting them is one tap. */}
      <View className="gap-1 rounded-2xl bg-surface p-4 dark:bg-surface-dark">
        <Text className="text-[13px] font-bold uppercase tracking-wider text-ink-3 dark:text-ink-3-dark">
          Opcional
        </Text>
        <Text className="text-[13px] leading-5 text-ink-2 dark:text-ink-2-dark">
          Tu fecha de nacimiento y tu género no son necesarios para usar Genobills. Si los
          compartes, solo los usamos para estadísticas generales y anónimas sobre quién usa la app —
          nunca para publicidad ni para decidir algo sobre ti. Puedes borrarlos cuando quieras. Más
          detalles en el <LegalLink doc="privacy" />.
        </Text>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
            Fecha de nacimiento
          </Text>
          {birthDate ? (
            <Pressable onPress={() => setBirthDate('')} hitSlop={8} accessibilityRole="button">
              <Text className="text-sm font-semibold text-danger dark:text-danger-dark">
                Borrar
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
          placeholder="Opcional"
        />
        {fieldErrors.birth_date ? (
          <Text className="text-xs text-danger dark:text-danger-dark">
            {fieldErrors.birth_date}
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
              Borrar género
            </Text>
          </Pressable>
        ) : null}
      </View>

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
