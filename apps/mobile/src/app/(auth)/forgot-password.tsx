import { useResetPasswordWithCode, useSendPasswordReset } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { passwordResetRequestSchema, passwordResetSchema } from '@repo/core/validators';
import { Button, ErrorCard, ICON_COLORS, PageHeader, Screen, TextField } from '@repo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, MailCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

// Wait between "Reenviar código" taps — Supabase rate-limits these emails too.
const RESEND_COOLDOWN_S = 60;

type Errors = { email?: string; code?: string; password?: string; confirm?: string; form?: string };

/**
 * "Olvidé mi contraseña", with a code instead of a link: works even if the
 * email is opened on another device, needs no deep link or redirect-URL
 * setup, and behaves the same on web and in Expo Go.
 *   1. email → Supabase emails a code (recovery template, `{{ .Token }}`);
 *   2. code + new password → verified, password set, signed in → Inicio.
 * `AuthRedirect` leaves this screen alone while signed in, so a failure
 * setting the password (after the code already signed the user in) is
 * still shown here instead of the app jumping to Inicio.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const sendCode = useSendPasswordReset();
  const reset = useResetPasswordWithCode();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = () => {
    setErrors({});
    const parsed = passwordResetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }
    if (sendCode.isPending) return;
    sendCode.mutate(parsed.data.email, {
      onSuccess: () => {
        setStep('code');
        setCooldown(RESEND_COOLDOWN_S);
      },
      onError: (e) => setErrors({ form: toFriendlyMessage(e, 'No se pudo enviar el código') }),
    });
  };

  const submit = () => {
    setErrors({});
    const parsed = passwordResetSchema.safeParse({ email, code, password, confirmPassword });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        code: f.code?.[0],
        password: f.password?.[0],
        confirm: f.confirmPassword?.[0],
      });
      return;
    }
    if (reset.isPending) return;
    reset.mutate(parsed.data, {
      onSuccess: () => router.replace('/(app)'),
      onError: (e) => setErrors({ form: toFriendlyMessage(e, 'No se pudo cambiar la contraseña') }),
    });
  };

  const eye = (
    <Pressable
      onPress={() => setShowPassword((v) => !v)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {showPassword ? (
        <EyeOff size={20} color={ICON_COLORS.ink3} />
      ) : (
        <Eye size={20} color={ICON_COLORS.ink3} />
      )}
    </Pressable>
  );

  return (
    <Screen scroll>
      <PageHeader title="" onBack={() => (step === 'code' ? setStep('email') : router.back())} />

      {step === 'email' ? (
        <View className="gap-5 pt-2">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
              ¿Olvidaste tu contraseña?
            </Text>
            <Text className="text-base text-ink-2 dark:text-ink-2-dark">
              Escribe tu correo y te enviaremos un código para crear una nueva.
            </Text>
          </View>

          <TextField
            label="Correo"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
            returnKeyType="send"
            onSubmitEditing={requestCode}
          />

          <ErrorCard message={errors.form} />

          <Button label="Enviar código" onPress={requestCode} loading={sendCode.isPending} />
        </View>
      ) : (
        <View className="gap-5 pt-2">
          <View className="gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-lime-tint dark:bg-lime-tint-dark">
              <MailCheck size={24} color={ICON_COLORS.limeInk} />
            </View>
            <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Revisa tu correo</Text>
            <Text className="text-base text-ink-2 dark:text-ink-2-dark">
              Si hay una cuenta con{' '}
              <Text className="font-semibold text-ink dark:text-ink-dark">{email.trim()}</Text>, te
              enviamos un código. Escríbelo aquí junto con tu nueva contraseña.
            </Text>
          </View>

          <TextField
            label="Código"
            placeholder="123456"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.code}
          />
          <TextField
            ref={passwordRef}
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={errors.password}
            rightElement={eye}
          />
          <TextField
            ref={confirmRef}
            label="Confirmar contraseña"
            placeholder="Escríbela de nuevo"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={errors.confirm}
          />

          <ErrorCard message={errors.form} />

          <Button label="Cambiar contraseña" onPress={submit} loading={reset.isPending} />

          <View className="flex-row flex-wrap justify-center gap-1">
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">¿No te llegó?</Text>
            {cooldown > 0 ? (
              <Text className="text-sm text-ink-3 dark:text-ink-3-dark">
                Reenviar en {cooldown} s
              </Text>
            ) : (
              <Pressable onPress={requestCode} hitSlop={8} disabled={sendCode.isPending}>
                <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Reenviar código
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
