import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

export interface StaggerItemProps {
  /** Position within the list this item belongs to — drives how long it
   * waits before animating in, so the list cascades top-to-bottom instead
   * of every row appearing at once. */
  index: number;
  children: ReactNode;
}

// Caps how many items actually stagger — item #30 in a long list waiting
// 30 * STAGGER_MS before animating would read as sluggish, not elegant, and
// it's already offscreen by the time its turn comes anyway.
const STAGGER_MS = 45;
const MAX_STAGGERED = 8;

/**
 * Wraps one row/card in a `.map()`-rendered list so it fades + rises into
 * place on its first mount, staggered by `index`. Plays once per mount, not
 * per render: a `.map()` keyed by a stable id (e.g. `item.id`) keeps the
 * same component instance across data refetches, so an already-visible row
 * never replays this. Not meant for a virtualized list that recycles
 * offscreen rows (a `FlatList`/`SectionList` with `removeClippedSubviews`
 * enabled) — recycling remounts rows on scroll, which would replay this on
 * every scroll-back.
 *
 * NativeWind has no `cssInterop` registered for Reanimated's `Animated.View`
 * — `className` here would silently do nothing. Keep layout/spacing classes
 * on `children`, not on this wrapper.
 */
export function StaggerItem({ index, children }: StaggerItemProps) {
  const delay = Math.min(index, MAX_STAGGERED) * STAGGER_MS;
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18).mass(0.6)}>
      {children}
    </Animated.View>
  );
}
