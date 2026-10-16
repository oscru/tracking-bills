import { useSignIn } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { signInSchema } from '@repo/core/validators';
import { Button, ErrorCard, ICON_COLORS, Screen, TextField } from '@repo/ui';
import { Link, useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SsoButtons } from '../../features/auth/sso-buttons';

export default function SignIn() {
  const signIn = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      onError: (e) => setErrors({ form: toFriendlyMessage(e, 'No se pudo iniciar sesión') }),
    });
  };

  return (
    <Screen center scroll>
      <View className="gap-5">
        <View className="mb-2 items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-lime">
            <Text className="text-2xl">💸</Text>
          </View>
          <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Genobills</Text>
        </View>

        <View className="gap-1">
          <Text className="text-2xl font-bold text-ink dark:text-ink-dark">Iniciar sesión</Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">
            Controla tus ingresos y gastos
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
        />
        <TextField
          label="Contraseña"
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          textContentType="password"
          error={errors.password}
          rightElement={
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
          }
        />

        <Pressable
          onPress={() =>
            router.push({ pathname: '/(auth)/forgot-password', params: { email: email.trim() } })
          }
          hitSlop={8}
          className="-mt-2 self-end"
        >
          <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>

        <ErrorCard message={errors.form} />

        <Button label="Entrar" onPress={onSubmit} loading={signIn.isPending} />

        <SsoButtons />

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
