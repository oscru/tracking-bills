import { Pressable, Text, View, type PressableProps } from 'react-native';

import { CategoryDot } from './category-dot';

export interface ChipProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  selected?: boolean;
  /** Optional leading color dot (e.g. a category color). */
  dotColor?: string | null;
  /** Optional leading icon (e.g. a category's icon) shown instead of the dot when set. */
  icon?: string | null;
}

export function Chip({ label, selected = false, dotColor, icon, ...props }: ChipProps) {
  // Selected: fill with the category color if one is given, else the lime accent.
  const colorFill = selected && dotColor ? dotColor : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={colorFill ? { backgroundColor: colorFill, borderColor: colorFill } : undefined}
      className={`h-10 flex-row items-center gap-2 rounded-full border px-3.5 ${
        selected && !colorFill
          ? 'border-lime bg-lime'
          : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark'
      }`}
      {...props}
    >
      {dotColor || icon ? (
        <CategoryDot color={colorFill ? '#fff' : dotColor} icon={icon} size={13} />
      ) : null}
      <Text
        className={`text-sm font-medium ${
          selected ? (colorFill ? 'text-white' : 'text-ink') : 'text-ink-2 dark:text-ink-2-dark'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
