import { Ionicons } from '@expo/vector-icons';
import { toFriendlyMessage } from '@repo/core/utils';
import { ErrorCard } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useOAuthSignIn } from './use-oauth-sign-in';

function SsoButton({
  icon,
  label,
  loading,
  disabled,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading: boolean;
  disabled: boolean;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={disabled ? { opacity: 0.5 } : undefined}
      className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-ctl border border-line bg-surface px-3 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          <Ionicons name={icon} size={19} color={iconColor} />
          <Text className="text-[15px] font-semibold text-ink dark:text-ink-dark">{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Google/Apple sign-in buttons shared by the sign-in and sign-up screens —
 * both just start an OAuth session, so there's nothing screen-specific to
 * configure here. */
export function SsoButtons() {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#F2F3F5' : '#1A1D21';
  const oauth = useOAuthSignIn();

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line dark:bg-line-dark" />
        <Text className="text-xs font-medium text-ink-3 dark:text-ink-3-dark">O CONTINÚA CON</Text>
        <View className="h-px flex-1 bg-line dark:bg-line-dark" />
      </View>

      <View className="flex-row gap-3">
        <SsoButton
          icon="logo-google"
          label="Google"
          iconColor={iconColor}
          loading={oauth.isPending && oauth.variables === 'google'}
          disabled={oauth.isPending}
          onPress={() => oauth.mutate('google')}
        />
        <SsoButton
          icon="logo-apple"
          label="Apple"
          iconColor={iconColor}
          loading={oauth.isPending && oauth.variables === 'apple'}
          disabled={oauth.isPending}
          onPress={() => oauth.mutate('apple')}
        />
      </View>

      <ErrorCard
        message={
          oauth.error ? toFriendlyMessage(oauth.error, 'No se pudo iniciar sesión') : undefined
        }
      />
    </View>
  );
}
