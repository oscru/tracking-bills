import { Ionicons } from '@expo/vector-icons';
import { Pressable, useColorScheme } from 'react-native';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}

/** Round 34px icon control — the shared header-button treatment, reusable for any glyph. */
export function IconButton({ icon, onPress, accessibilityLabel }: IconButtonProps) {
  const dark = useColorScheme() === 'dark';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F2F4] active:opacity-70 dark:bg-line-dark"
    >
      <Ionicons name={icon} size={20} color={dark ? '#F2F3F5' : '#1A1D21'} />
    </Pressable>
  );
}
