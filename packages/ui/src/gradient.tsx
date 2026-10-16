import { useId, useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ICON_COLORS } from './icon-colors';

/**
 * The "2026" accents of the Lima + tinta system, each with ONE meaning:
 * - `GradientFill` (lime): THE ACTION — the primary action or active state,
 *   at most one per screen.
 * - `HeroCard` (ink + glow): THE NUMBER — the one figure a screen is about.
 * Everything else stays solid. Drawn with react-native-svg (already in the
 * app), so no extra native module.
 */

/** Lime → chartreuse → green, top-left to bottom-right. */
export const LIME_GRADIENT = ['#E3FF6B', '#B9F227', '#8EE05A'] as const;

/**
 * How far (px) the pale and green ends reach into a wide fill. The gradient
 * used to stretch corner to corner whatever the size, so on a long button
 * ("Guardar", the sidebar's action) the pale lime covered a whole third of
 * it and the button read washed out next to a small one. Now a wide fill is
 * the saturated middle lime with the ends only as accents, so every button
 * is the same tone; anything up to twice this wide looks exactly as before.
 */
const ACCENT_SPAN = 64;

/** `react-native-svg` ids must be plain — React's `useId` includes colons. */
function useSvgId(prefix: string) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

export interface GradientFillProps {
  /** Corner radius — match the parent's `borderRadius`. */
  radius?: number;
  colors?: readonly string[];
  /** A soft white sheen across the top half — reads as a lit, raised surface. */
  sheen?: boolean;
}

/**
 * Fills its parent (absolutely positioned, behind the parent's other
 * children) with the lime action gradient. Put it first inside the
 * `Pressable`/`View` it fills; `radius` should match that parent's
 * `borderRadius`.
 *
 * Sized by layout, not by the SVG: a `View` stretched over the parent
 * clips the corners, and the SVG inside draws on a fixed 100×100
 * `viewBox` stretched to whatever size that is. An SVG sized with
 * `width="100%"` kept its first measured size on Android when the parent
 * was resized by a Reanimated animation — the navbar capsule opened, but
 * its gradient stayed a 44px circle.
 */
export function GradientFill({
  radius = 0,
  colors = LIME_GRADIENT,
  sheen = true,
}: GradientFillProps) {
  const fillId = useSvgId('fill');
  const sheenId = useSvgId('sheen');
  const [width, setWidth] = useState(0);
  const last = colors.length - 1;
  // Fraction of the width each end's accent takes (0.5 = the original
  // corner-to-corner gradient, for small fills and before layout).
  const edge = width > 0 ? Math.min(0.5, ACCENT_SPAN / width) : 0.5;
  const mid = colors[Math.floor(last / 2)] ?? colors[0];
  const stops =
    edge < 0.5 && last >= 2
      ? [
          { offset: 0, color: colors[0] },
          { offset: edge, color: mid },
          { offset: 1 - edge, color: mid },
          { offset: 1, color: colors[last] },
        ]
      : colors.map((c, i) => ({ offset: last === 0 ? 0 : i / last, color: c }));
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            {stops.map((stop, i) => (
              <Stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </LinearGradient>
          <LinearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#${fillId})`} />
        {sheen ? <Rect x="0" y="0" width="100" height="100" fill={`url(#${sheenId})`} /> : null}
      </Svg>
    </View>
  );
}

/** The soft lime halo behind a primary circular action (the navbar's "+"). */
export const LIME_GLOW: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#8CD228',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 10, shadowColor: '#8CD228' },
  default: {},
}) as ViewStyle;

export interface HeroCardProps {
  children: ReactNode;
  /** The glow color — lime by default; an account's own color on its detail screen. */
  tint?: string | null;
  radius?: number;
  /** Inner padding (the content box). */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  /** Style for the inner content box — e.g. `{ justifyContent: 'center' }` when the card stretches. */
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * `dark` (default): the full ink hero — text inside must be light.
   * `light`: the discreet one — a normal surface (white / dark-mode surface)
   * with only a soft glow in the corner and the gradient hairline; regular
   * ink text works inside. For screens where a dark block is too loud.
   */
  variant?: 'dark' | 'light';
}

const HERO_SHADOW: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#15181C',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
  },
  android: { elevation: 8 },
  default: {},
}) as ViewStyle;

/**
 * Dark "hero" surface for a screen's headline number: ink with a soft glow
 * in `tint` from the top-right corner and a hairline gradient border.
 * Always dark, in both themes — text inside should be light (`text-white`,
 * `text-white/70`).
 */
export function HeroCard({
  children,
  tint,
  radius = 26,
  padding = 22,
  style,
  contentStyle,
  variant = 'dark',
}: HeroCardProps) {
  const glow = tint ?? ICON_COLORS.lime;
  const light = variant === 'light';
  const darkScheme = useColorScheme() === 'dark';
  // Light variant: the card's own surface color, so it sits with the other cards.
  const base = light
    ? darkScheme
      ? [ICON_COLORS.surfaceDark, ICON_COLORS.surfaceDark]
      : [ICON_COLORS.surface, ICON_COLORS.surface]
    : ['#1E2228', '#121417'];
  const borderId = useSvgId('border');
  const baseId = useSvgId('base');
  const glowId = useSvgId('glow');
  return (
    <View style={[{ borderRadius: radius }, light ? null : HERO_SHADOW, style]}>
      {/* Border: the same shape 1px larger, showing through as a gradient
      hairline. Clipped by a View and drawn on a stretched viewBox (see
      `GradientFill`), so it follows the card's size as its content changes. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      >
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={borderId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={glow} stopOpacity={light ? 0.7 : 0.9} />
              <Stop offset="0.42" stopColor={glow} stopOpacity={0} />
              <Stop offset="0.7" stopColor="#6EDCA0" stopOpacity={0} />
              <Stop offset="1" stopColor="#6EDCA0" stopOpacity={light ? 0.35 : 0.55} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${borderId})`} />
        </Svg>
      </View>
      <View
        style={[
          // flexGrow: fills the card when the caller stretches it (`style={{ flex: 1 }}`).
          {
            flexGrow: 1,
            margin: 1,
            borderRadius: radius - 1,
            overflow: 'hidden',
            padding: padding - 1,
          },
          contentStyle,
        ]}
      >
        <Svg
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={baseId} x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={base[0]} />
              <Stop offset="1" stopColor={base[1]} />
            </LinearGradient>
            <RadialGradient id={glowId} cx="100%" cy="0%" rx="85%" ry="95%" fx="100%" fy="0%">
              <Stop offset="0" stopColor={glow} stopOpacity={light ? 0.16 : 0.32} />
              <Stop offset="1" stopColor={glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${baseId})`} />
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${glowId})`} />
        </Svg>
        {children}
      </View>
    </View>
  );
}
