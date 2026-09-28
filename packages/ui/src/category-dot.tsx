import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export interface CategoryDotProps {
  /** The category's color; falls back to a neutral gray. */
  color?: string | null;
  /** The category's icon (an Ionicons glyph name). When set, replaces the plain dot. */
  icon?: string | null;
  /** Size of the icon glyph, or the dot's diameter when there's no icon. */
  size?: number;
}

/** A category's own glyph when it has one, else a plain color dot — the one
 * indicator used everywhere a category shows up (lists, pickers, filters). */
export function CategoryDot({ color, icon, size = 14 }: CategoryDotProps) {
  const tint = color ?? '#94A3B8';
  if (icon) {
    return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size} color={tint} />;
  }
  return (
    <View
      className="rounded-full"
      style={{ width: size * 0.7, height: size * 0.7, backgroundColor: tint }}
    />
  );
}
