import type { LucideIcon } from 'lucide-react-native';
import { Pressable, useColorScheme } from 'react-native';

export interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  /** Fills the glyph instead of just outlining it — e.g. a toggled "favorited" heart. */
  filled?: boolean;
}

/** Round 34px icon control — the shared header-button treatment, reusable for any glyph. */
export function IconButton({ icon: Icon, onPress, accessibilityLabel, filled = false }: IconButtonProps) {
  const dark = useColorScheme() === 'dark';
  const color = dark ? '#F2F3F5' : '#1A1D21';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F2F4] active:opacity-70 dark:bg-line-dark"
    >
      <Icon size={20} color={color} fill={filled ? color : 'none'} />
    </Pressable>
  );
}
