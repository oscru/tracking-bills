import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * "It floats": a frosted surface for elements that sit over scrolling
 * content (the tab bar, a pinned list header) — never for ordinary cards.
 *
 * iOS gets a real backdrop blur. Android doesn't: blurring there means
 * wrapping the content behind in a `BlurTargetView`, which for the tab bar
 * is the whole tab navigator — a real frame cost on every scroll. It gets
 * the same tint at higher opacity instead, which over the bar's near-opaque
 * ink reads almost identically. Web gets the tint too.
 */
export interface GlassProps {
  /** `dark`: ink glass (the tab bar). `light`: canvas glass (pinned headers). */
  tone: 'dark' | 'light';
  /** Rounds the blur and tint together. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const TINT = {
  // Over the iOS blur: translucent, so content shows through softly.
  ios: { dark: 'rgba(22,25,29,0.62)', light: 'rgba(246,247,249,0.55)' },
  // No blur underneath: more opaque so text behind doesn't compete.
  other: { dark: 'rgba(22,25,29,0.94)', light: 'rgba(246,247,249,0.96)' },
};
const LIGHT_DARK_MODE = { ios: 'rgba(11,13,15,0.55)', other: 'rgba(11,13,15,0.95)' };

export function Glass({
  tone,
  radius = 0,
  style,
  children,
  darkScheme = false,
}: GlassProps & {
  /** For `light` glass: the app is in dark mode, so tint with the dark canvas. */
  darkScheme?: boolean;
}) {
  const ios = Platform.OS === 'ios';
  const tint =
    tone === 'light' && darkScheme
      ? LIGHT_DARK_MODE[ios ? 'ios' : 'other']
      : TINT[ios ? 'ios' : 'other'][tone];

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {ios ? (
        <BlurView
          intensity={tone === 'dark' ? 40 : 30}
          tint={tone === 'dark' || darkScheme ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </View>
  );
}
