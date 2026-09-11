import { useSignIn } from '@repo/core/hooks';
import { signInSchema } from '@repo/core/validators';
import { Button, Screen, TextField } from '@repo/ui';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

export default function SignIn() {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const onSubmit = () => {
    setErrors({});
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    signIn.mutate(parsed.data, {
      onError: (e) =>
        setErrors({ form: e instanceof Error ? e.message : 'No se pudo iniciar sesión' }),
    });
  };

  return (
    <Screen center scroll>
      <View className="gap-5">
        <View className="mb-2 items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-lime">
            <Text className="text-2xl font-black text-ink">$</Text>
          </View>
          <Text className="text-sm text-ink-3 dark:text-ink-3-dark">[nombre de la app]</Text>
        </View>

        <View className="gap-1">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Iniciar sesión</Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">
            Controla tus ingresos y gastos
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
          autoComplete="current-password"
          textContentType="password"
          error={errors.password}
        />

        {errors.form ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{errors.form}</Text>
        ) : null}

        <Button label="Entrar" onPress={onSubmit} loading={signIn.isPending} />

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-ink-2 dark:text-ink-2-dark">¿No tienes cuenta?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
              Crear cuenta
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
