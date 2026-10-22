import { useSignIn } from '@repo/core/hooks';
import { toFriendlyMessage } from '@repo/core/utils';
import { signInSchema } from '@repo/core/validators';
import { Button, ErrorCard, ICON_COLORS, StaggerItem, TextField } from '@repo/ui';
import { Link, useRouter } from 'expo-router';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AuthShell } from '../../features/auth/auth-shell';
import { SsoButtons } from '../../features/auth/sso-buttons';
import { SsoLegalNotice } from '../../features/legal/legal';

export default function SignIn() {
  const signIn = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const dark = useColorScheme().colorScheme === 'dark';
  const iconColor = dark ? ICON_COLORS.ink3Dark : ICON_COLORS.ink3;
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const onSubmit = () => {
    setErrors({});
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    if (signIn.isPending) return;
    signIn.mutate(parsed.data, {
      onError: (e) => setErrors({ form: toFriendlyMessage(e, 'No se pudo iniciar sesión') }),
    });
  };

  return (
    <AuthShell>
      <StaggerItem index={2}>
        <View className="gap-1.5">
          <Text className="text-[28px] font-bold tracking-tight text-ink dark:text-ink-dark">
            Hola de nuevo 👋
          </Text>
          <Text className="text-base text-ink-2 dark:text-ink-2-dark">
            Entra para ver cómo van tus cuentas.
          </Text>
        </View>
      </StaggerItem>

      <StaggerItem index={3}>
        <View className="gap-4">
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
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={errors.email}
            leftElement={<Mail size={18} color={iconColor} />}
          />
          <View className="gap-2">
            <TextField
              ref={passwordRef}
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              error={errors.password}
              leftElement={<Lock size={18} color={iconColor} />}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={iconColor} />
                  ) : (
                    <Eye size={20} color={iconColor} />
                  )}
                </Pressable>
              }
            />
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(auth)/forgot-password',
                  params: { email: email.trim() },
                })
              }
              hitSlop={8}
              className="self-end"
            >
              <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
                ¿Olvidaste tu contraseña?
              </Text>
            </Pressable>
          </View>

          <ErrorCard message={errors.form} />

          <Button label="Entrar" onPress={onSubmit} loading={signIn.isPending} />
        </View>
      </StaggerItem>

      <StaggerItem index={4}>
        <View className="gap-6">
          <View className="gap-3">
            <SsoButtons />
            <SsoLegalNotice />
          </View>

          <View className="flex-row items-center justify-center gap-1.5 rounded-ctl bg-surface px-4 py-3.5 dark:bg-surface-dark">
            <Text className="text-sm text-ink-2 dark:text-ink-2-dark">¿Nuevo en Genobills?</Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable hitSlop={8} className="flex-row items-center gap-1">
                <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
                  Crea tu cuenta gratis
                </Text>
                <ArrowRight
                  size={15}
                  color={dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk}
                />
              </Pressable>
            </Link>
          </View>
        </View>
      </StaggerItem>
    </AuthShell>
  );
}
