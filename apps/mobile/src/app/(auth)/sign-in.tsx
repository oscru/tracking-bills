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
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const onSubmit = () => {
    setErrors({});
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    // On success the SessionProvider updates and the AuthGate routes to /(app).
    signIn.mutate(parsed.data, {
      onError: (e) => setErrors({ form: e instanceof Error ? e.message : 'Sign in failed' }),
    });
  };

  return (
    <Screen center>
      <View className="gap-5">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Welcome back
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-400">
            Sign in to continue
          </Text>
        </View>

        <TextField
          label="Email"
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
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          error={errors.password}
        />

        {errors.form ? <Text className="text-sm text-red-500">{errors.form}</Text> : null}

        <Button label="Sign in" onPress={onSubmit} loading={signIn.isPending} />

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">No account?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Sign up
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
