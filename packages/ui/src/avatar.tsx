import { Text, View } from 'react-native';

export interface AvatarProps {
  /** Full name or email; the first letter is shown. */
  name?: string | null;
  size?: number;
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <View
      className="items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark"
      style={{ width: size, height: size }}
    >
      <Text
        className="font-bold text-lime-ink dark:text-lime-ink-dark"
        style={{ fontSize: size * 0.38 }}
      >
        {initial}
      </Text>
    </View>
  );
}
