import { useDeleteOwnAccount, useSession, useSignIn } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { Button, ErrorCard, ICON_COLORS, PageHeader, Screen, TextField } from '@repo/ui';
import { useRouter } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function DeleteAccount() {
  const { t } = useTranslation('profile');
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
  const confirmMatches = confirmText.trim().toUpperCase() === t('delete.confirmWord');
  const canSubmit = identityConfirmed && confirmMatches && Boolean(user?.email);
  const submitting = signIn.isPending || deleteAccount.isPending;

  const runDelete = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => router.replace('/(auth)/sign-in'),
      onError: (e) => setError(toFriendlyMessage(e, t('delete.failed'))),
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
        onError: (e) => setError(toFriendlyMessage(e, t('delete.wrongPassword'))),
      },
    );
  };

  return (
    <Screen edges={['top', 'bottom']} scroll className="gap-5">
      <PageHeader title={t('deleteAccount')} onBack={() => router.back()} />

      <View className="flex-row gap-3 rounded-2xl bg-danger-tint p-4 dark:bg-danger-tint-dark">
        <TriangleAlert size={20} color={ICON_COLORS.danger} />
        <Text className="flex-1 text-[13px] leading-[18px] text-danger dark:text-danger-dark">
          <Trans
            t={t}
            i18nKey={user?.email ? 'delete.warning' : 'delete.warningNoEmail'}
            values={{ email: user?.email ?? '' }}
            components={{ b: <Text className="font-bold" />, email: <Text /> }}
          />
        </Text>
      </View>

      {hasPassword ? (
        <TextField
          label={t('delete.password')}
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
            label={t('delete.typeEmail')}
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
            {t('delete.ssoNote', { email: user?.email ?? '' })}
          </Text>
        </View>
      )}

      <TextField
        label={t('delete.typeWord', { word: t('delete.confirmWord') })}
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
        label={t('delete.submit')}
        variant="ghost-danger"
        disabled={!canSubmit}
        loading={submitting}
        onPress={submit}
      />
    </Screen>
  );
}
