import { useSignUp } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { signUpSchema } from '@repo/core/validators';
import { Button, ErrorCard, Screen, TextField } from '@repo/ui';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

export default function SignUp() {
  const signUp = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});
  const [confirmationSent, setConfirmationSent] = useState(false);

  const onSubmit = () => {
    setErrors({});
    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: 'Las contraseñas no coinciden' });
      return;
    }
    signUp.mutate(parsed.data, {
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
        <View className="gap-1">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Crea tu cuenta</Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">
            Lleva tus ingresos y gastos en un solo lugar
          </Text>
        </View>

        <TextField
          label="Correo"
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
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
        />
        <TextField
          label="Confirmar contraseña"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          error={errors.confirm}
        />

        <ErrorCard message={errors.form} />

        <Button label="Crear cuenta" onPress={onSubmit} loading={signUp.isPending} />

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">¿Ya tienes cuenta?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
              Iniciar sesión
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
