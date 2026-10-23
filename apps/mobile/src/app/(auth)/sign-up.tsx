import { useSignUp } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { signUpSchema } from '@repo/core/validators';
import { Button, ErrorCard, ICON_COLORS, StaggerItem, TextField } from '@repo/ui';
import { Link } from 'expo-router';
import { Eye, EyeOff, MailCheck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthShell } from '../../features/auth/auth-shell';
import { PasswordChecklist } from '../../features/auth/password-checklist';
import { SsoButtons } from '../../features/auth/sso-buttons';
import { LegalConsent, SsoLegalNotice } from '../../features/legal/legal';

type Errors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  acceptsLegal?: string;
  form?: string;
};

/**
 * Creating an account asks only for what the app needs to work: a name to
 * greet you, and an email and password to sign in. Birth date and gender
 * are optional and live in the profile (see the Aviso de privacidad).
 */
export default function SignUp() {
  const { t } = useTranslation('auth');
  const signUp = useSignUp();
  const dark = useColorScheme().colorScheme === 'dark';
  const iconColor = dark ? ICON_COLORS.ink3Dark : ICON_COLORS.ink3;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptsLegal, setAcceptsLegal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmationSent, setConfirmationSent] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const onSubmit = () => {
    setErrors({});
    const parsed = signUpSchema.safeParse({ fullName, email, password, acceptsLegal });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: f.fullName?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
        acceptsLegal: f.acceptsLegal?.[0],
      });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: 'validation:passwordsDontMatch' });
      return;
    }
    if (signUp.isPending) return;
    signUp.mutate(parsed.data, {
      onSuccess: (res) => {
        if (res.needsEmailConfirmation) setConfirmationSent(true);
      },
      onError: (e) => setErrors({ form: toFriendlyMessage(e, t('signUp.failed')) }),
    });
  };

  if (confirmationSent) {
    return (
      <AuthShell>
        <View className="gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-lime-tint dark:bg-lime-tint-dark">
            <MailCheck size={24} color={ICON_COLORS.limeInk} />
          </View>
          <Text className="text-[28px] font-bold tracking-tight text-ink dark:text-ink-dark">
            {t('signUp.checkEmailTitle')}
          </Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">
            {t('signUp.checkEmailBody', { email })}
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable hitSlop={8}>
              <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
                {t('signUp.backToSignIn')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <StaggerItem index={2}>
        <View className="gap-1.5">
          <Text className="text-[28px] font-bold tracking-tight text-ink dark:text-ink-dark">
            {t('signUp.title')}
          </Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">{t('signUp.subtitle')}</Text>
        </View>
      </StaggerItem>

      <StaggerItem index={3}>
        <View className="gap-4">
          <TextField
            placeholder={t('fields.name')}
            accessibilityLabel={t('fields.name')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errors.fullName}
          />
          <TextField
            ref={emailRef}
            placeholder={t('fields.email')}
            accessibilityLabel={t('fields.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.email}
          />
          <TextField
            ref={passwordRef}
            placeholder={t('fields.password')}
            accessibilityLabel={t('fields.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.password}
            rightElement={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t(showPassword ? 'fields.hidePassword' : 'fields.showPassword')}
              >
                {showPassword ? (
                  <EyeOff size={20} color={iconColor} />
                ) : (
                  <Eye size={20} color={iconColor} />
                )}
              </Pressable>
            }
          />
          {password ? <PasswordChecklist password={password} /> : null}
          <TextField
            ref={confirmRef}
            placeholder={t('fields.confirmPassword')}
            accessibilityLabel={t('fields.confirmPassword')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            error={errors.confirm}
          />

          <LegalConsent
            checked={acceptsLegal}
            onChange={(v) => {
              setAcceptsLegal(v);
              if (v) setErrors((e) => ({ ...e, acceptsLegal: undefined }));
            }}
            error={errors.acceptsLegal}
          />

          <ErrorCard message={errors.form} />

          <Button label={t('signUp.submit')} onPress={onSubmit} loading={signUp.isPending} />
        </View>
      </StaggerItem>

      <StaggerItem index={4}>
        <View className="gap-6">
          <View className="gap-3">
            <SsoButtons />
            <SsoLegalNotice />
          </View>

          <View className="flex-row items-center justify-center gap-1.5">
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">
              {t('signUp.haveAccount')}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable hitSlop={8}>
                <Text className="text-sm font-semibold text-ink underline dark:text-ink-dark">
                  {t('signUp.signIn')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </StaggerItem>
    </AuthShell>
  );
}
