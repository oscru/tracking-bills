import { Pressable, Text, View, type PressableProps } from 'react-native';

export interface ChipProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  selected?: boolean;
  /** Optional leading color dot (e.g. a category color). */
  dotColor?: string | null;
}

export function Chip({ label, selected = false, dotColor, ...props }: ChipProps) {
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
      {dotColor ? (
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: colorFill ? '#fff' : dotColor }}
        />
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
