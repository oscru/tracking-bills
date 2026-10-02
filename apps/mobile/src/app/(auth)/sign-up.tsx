import { Ionicons } from '@expo/vector-icons';
import { useSignUp } from '@repo/core/hooks';
import type { Gender } from '@repo/core/types';
import { toFriendlyMessage } from '@repo/core/utils';
import { signUpSchema } from '@repo/core/validators';
import { BackButton, Button, ErrorCard, Screen, TextField } from '@repo/ui';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SsoButtons } from '../../features/auth/sso-buttons';
import { GenderField } from '../../features/auth/gender-field';
import { PasswordChecklist } from '../../features/auth/password-checklist';
import { DateField } from '../../features/transactions/date-field';

const infoSchema = signUpSchema.pick({ fullName: true, birthDate: true, gender: true });
const credentialsSchema = signUpSchema.pick({ email: true, password: true });

export default function SignUp() {
  const signUp = useSignUp();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});
  const [confirmationSent, setConfirmationSent] = useState(false);

  const onNext = () => {
    setErrors({});
    const parsed = infoSchema.safeParse({ fullName, birthDate, gender });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ fullName: f.fullName?.[0], birthDate: f.birthDate?.[0], gender: f.gender?.[0] });
      return;
    }
    setStep(2);
  };

  const onSubmit = () => {
    setErrors({});
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: 'Las contraseñas no coinciden' });
      return;
    }
    const full = signUpSchema.safeParse({ fullName, email, birthDate, gender, password });
    if (!full.success) {
      setErrors({ form: 'Revisa la información del paso anterior' });
      setStep(1);
      return;
    }
    signUp.mutate(full.data, {
      onSuccess: (res) => {
        if (res.needsEmailConfirmation) setConfirmationSent(true);
      },
      onError: (e) => setErrors({ form: toFriendlyMessage(e, 'No se pudo crear la cuenta') }),
    });
  };

  if (confirmationSent) {
    return (
      <Screen center scroll>
        <View className="gap-3">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Revisa tu correo</Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">
            Te enviamos un enlace de confirmación a {email}. Confírmalo y luego inicia sesión.
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
              Volver a iniciar sesión
            </Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen center scroll>
      <View className="gap-5">
        {step === 2 ? (
          <View>
            <BackButton onPress={() => setStep(1)} />
          </View>
        ) : null}

        <View className="gap-3">
          <View className="flex-row gap-1.5">
            <View
              className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-ink dark:bg-ink-dark' : 'bg-line dark:bg-line-dark'}`}
            />
            <View
              className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-ink dark:bg-ink-dark' : 'bg-line dark:bg-line-dark'}`}
            />
          </View>
          <Text className="text-xs font-medium text-ink-3 dark:text-ink-3-dark">
            Paso {step} de 2
          </Text>
        </View>

        {step === 1 ? (
          <View className="gap-1">
            <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Tu información</Text>
            <Text className="text-base text-ink-2 dark:text-ink-2-dark">
              Cuéntanos un poco sobre ti
            </Text>
          </View>
        ) : (
          <View className="gap-1">
            <Text className="text-2xl font-bold text-ink dark:text-ink-dark">
              Tu correo y contraseña
            </Text>
            <Text className="text-base text-ink-2 dark:text-ink-2-dark">
              Con esto vas a iniciar sesión
            </Text>
          </View>
        )}

        {step === 1 ? (
          <>
            <TextField
              label="Nombre"
              placeholder="Ej. Ana García"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              error={errors.fullName}
            />

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
                Fecha de nacimiento
              </Text>
              <DateField
                value={birthDate}
                onChange={setBirthDate}
                showQuickChips={false}
                placeholder="Selecciona tu fecha de nacimiento"
              />
              {errors.birthDate ? (
                <Text className="text-xs text-danger dark:text-danger-dark">
                  {errors.birthDate}
                </Text>
              ) : null}
            </View>

            <GenderField value={gender} onChange={setGender} error={errors.gender} />

            <Button label="Siguiente" onPress={onNext} />

            <SsoButtons />

            <View className="flex-row justify-center gap-1">
              <Text className="text-sm text-ink-2 dark:text-ink-2-dark">¿Ya tienes cuenta?</Text>
              <Link href="/(auth)/sign-in" asChild>
                <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Iniciar sesión
                </Text>
              </Link>
            </View>
          </>
        ) : (
          <>
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
            />

            <TextField
              label="Contraseña"
              placeholder="Crea una contraseña segura"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              error={errors.password}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              }
            />

            {password ? <PasswordChecklist password={password} /> : null}

            <TextField
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              autoComplete="new-password"
              error={errors.confirm}
              rightElement={
                <Pressable
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </Pressable>
              }
            />

            <ErrorCard message={errors.form} />

            <Button label="Crear cuenta" onPress={onSubmit} loading={signUp.isPending} />
          </>
        )}
      </View>
    </Screen>
  );
}
