import { Pressable, Text, type PressableProps } from 'react-native';

export interface FabProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Single glyph or short label; defaults to a plus sign. */
  glyph?: string;
  accessibilityLabel: string;
}

/** Floating action button, pinned bottom-right by the caller's container. */
export function Fab({ glyph = '+', accessibilityLabel, ...props }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-14 w-14 items-center justify-center rounded-full bg-neutral-900 shadow-lg active:opacity-80 dark:bg-white"
      {...props}
    >
      <Text className="text-2xl font-semibold leading-none text-white dark:text-neutral-900">
        {glyph}
      </Text>
    </Pressable>
  );
}
