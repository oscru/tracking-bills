import { Pressable, Text, type PressableProps } from 'react-native';

export interface FabProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Single glyph or short label; defaults to a plus sign. */
  glyph?: string;
  accessibilityLabel: string;
}

/**
 * Floating action button, pinned bottom-right by the caller's container.
 * Ink circle + lime glyph in light; lime circle + ink glyph in dark.
 */
export function Fab({ glyph = '+', accessibilityLabel, ...props }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-14 w-14 items-center justify-center rounded-full bg-ink shadow-lg active:opacity-80 dark:bg-lime"
      {...props}
    >
      <Text className="text-2xl font-semibold leading-none text-lime dark:text-ink">{glyph}</Text>
    </Pressable>
  );
}
