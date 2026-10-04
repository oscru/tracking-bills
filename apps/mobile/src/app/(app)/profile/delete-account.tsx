import { Ionicons } from '@expo/vector-icons';
import { useDeleteOwnAccount, useSession, useSignIn } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { Button, ErrorCard, ICON_COLORS, PageHeader, Screen, TextField } from '@repo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

const CONFIRM_WORD = 'ELIMINAR';

export default function DeleteAccount() {
  const router = useRouter();
  const { user } = useSession();
  const signIn = useSignIn();
  const deleteAccount = useDeleteOwnAccount();

  // A user who only ever signed in via Google/Apple has no 'email' identity
  // — i.e. no password Supabase could check. Supabase represents email/
  // password auth as its own linked identity, same as any OAuth provider.
  const hasPassword = (user?.identities ?? []).some((i) => i.provider === 'email');

  const [password, setPassword] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const identityConfirmed = hasPassword
    ? password.length > 0
    : emailConfirm.trim().toLowerCase() === (user?.email ?? '').toLowerCase() &&
      emailConfirm.trim().length > 0;
  const confirmMatches = confirmText.trim().toUpperCase() === CONFIRM_WORD;
  const canSubmit = identityConfirmed && confirmMatches && Boolean(user?.email);
  const submitting = signIn.isPending || deleteAccount.isPending;

  const runDelete = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => router.replace('/(auth)/sign-in'),
      onError: (e) => setError(toFriendlyMessage(e, 'No se pudo eliminar la cuenta')),
    });
  };

  const submit = () => {
    setError(null);
    if (!user?.email) return;

    if (!hasPassword) {
      // No password to check — the live session plus typing the account's
      // own email correctly is the identity proof available here.
      runDelete();
      return;
    }

    // Re-authenticate first — the one check that proves whoever is holding
    // this (possibly already-unlocked) phone actually knows the account's
    // password, not just that a session happens to still be alive.
    signIn.mutate(
      { email: user.email, password },
      {
        onSuccess: runDelete,
        onError: (e) => setError(toFriendlyMessage(e, 'Contraseña incorrecta')),
      },
    );
  };

  return (
    <Screen edges={['top', 'bottom']} scroll className="gap-5">
      <PageHeader title="Eliminar cuenta" onBack={() => router.back()} />

      <View className="flex-row gap-3 rounded-2xl bg-danger-tint p-4 dark:bg-danger-tint-dark">
        <Ionicons name="warning" size={20} color={ICON_COLORS.danger} />
        <Text className="flex-1 text-[13px] leading-[18px] text-danger dark:text-danger-dark">
          Esto elimina tu cuenta
          {user?.email ? (
            <>
              {' '}
              (<Text className="font-bold">{user.email}</Text>)
            </>
          ) : null}{' '}
          y <Text className="font-bold">todos</Text> tus datos de forma permanente — cuentas,
          movimientos, presupuestos, metas, categorías y tags. No se puede deshacer.
        </Text>
      </View>

      {hasPassword ? (
        <TextField
          label="Confirma tu contraseña"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
      ) : (
        <View className="gap-1.5">
          <TextField
            label="Escribe tu correo para confirmar"
            value={emailConfirm}
            onChangeText={(v) => {
              setEmailConfirm(v);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            Iniciaste sesión con Google/Apple, así que no tienes una contraseña que confirmar —
            escribe el correo con el que creaste tu cuenta ({user?.email}) en su lugar.
          </Text>
        </View>
      )}

      <TextField
        label={`Escribe "${CONFIRM_WORD}" para confirmar`}
        value={confirmText}
        onChangeText={(v) => {
          setConfirmText(v);
          setError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <ErrorCard message={error} />

      <Button
        label="Eliminar mi cuenta permanentemente"
        variant="ghost-danger"
        disabled={!canSubmit}
        loading={submitting}
        onPress={submit}
      />
    </Screen>
  );
}
