import { useSignUp } from '@repo/core/hooks';
import { signUpSchema } from '@repo/core/validators';
import { Button, Screen, TextField } from '@repo/ui';
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
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    signUp.mutate(parsed.data, {
      onSuccess: (res) => {
        // No session => the project requires email confirmation.
        if (res.needsEmailConfirmation) setConfirmationSent(true);
        // Otherwise the AuthGate routes to /(app) once the session lands.
      },
      onError: (e) => setErrors({ form: e instanceof Error ? e.message : 'Sign up failed' }),
    });
  };

  if (confirmationSent) {
    return (
      <Screen center>
        <View className="gap-3">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Check your email
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-400">
            We sent a confirmation link to {email}. Confirm it, then sign in.
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Back to sign in
            </Text>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen center>
      <View className="gap-5">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Create your account
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-400">
            Track income and expenses in one place
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
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          error={errors.confirm}
        />

        {errors.form ? <Text className="text-sm text-red-500">{errors.form}</Text> : null}

        <Button label="Sign up" onPress={onSubmit} loading={signUp.isPending} />

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            Already have an account?
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              Sign in
            </Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}
