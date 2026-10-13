import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// Only `transform` and `opacity` are animated, on purpose. An earlier
// version "drew" the strokes by animating the SVG's `strokeDashoffset`, but
// that's not a prop Reanimated can apply on its fast path: every frame
// meant a full commit + SVG repaint, competing with the screen that's
// rendering at that very moment (the icon changes as you navigate) — so it
// stuttered. Transforms/opacity just move already-drawn layers.
const OUT_DURATION = 150;
const IN_DELAY = 60;
const IN_DURATION = 280;
// The outgoing icon turns away by this much; the incoming one settles from
// the opposite side, so the two read as one continuous rotation.
const TURN_DEG = 90;
const MIN_SCALE = 0.4;

type Direction = 'static' | 'in' | 'out';

/**
 * One icon, entering (`in`), leaving (`out`) or just shown (`static`). Owns
 * its own progress, so a layer that was still entering when the icon
 * changed again simply turns around from wherever it got to.
 */
function IconLayer({
  icon: Icon,
  direction,
  color,
  size,
  strokeWidth,
}: {
  icon: LucideIcon;
  direction: Direction;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  // 1 = fully shown, 0 = gone.
  const progress = useSharedValue(direction === 'in' ? 0 : 1);

  useEffect(() => {
    if (direction === 'in') {
      progress.value = withDelay(
        IN_DELAY,
        withTiming(1, { duration: IN_DURATION, easing: Easing.out(Easing.cubic) }),
      );
    } else if (direction === 'out') {
      progress.value = withTiming(0, { duration: OUT_DURATION, easing: Easing.in(Easing.quad) });
    }
  }, [direction, progress]);

  const style = useAnimatedStyle(() => {
    const hidden = 1 - progress.value;
    return {
      opacity: progress.value,
      transform: [
        { rotate: `${(direction === 'out' ? TURN_DEG : -TURN_DEG) * hidden}deg` },
        { scale: 1 - (1 - MIN_SCALE) * hidden },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Icon color={color} size={size} strokeWidth={strokeWidth} />
    </Animated.View>
  );
}

/**
 * The tab bar action button's glyph. When `icon` changes (e.g. "+" → the
 * pencil of "editar"), the old one turns away and shrinks out while the new
 * one turns in and grows into place — like SF Symbols' "replace" effect.
 * Runs entirely on the UI thread.
 */
export function ActionIcon({
  icon,
  color,
  size = 24,
  strokeWidth = 2.5,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  // `gen` keys each layer, so the layer that was current becomes the
  // outgoing one (same instance, reversing from its current progress) and
  // the new icon mounts fresh at zero.
  const [layers, setLayers] = useState<{
    current: { icon: LucideIcon; gen: number };
    previous: { icon: LucideIcon; gen: number } | null;
  }>({ current: { icon, gen: 0 }, previous: null });

  if (layers.current.icon !== icon) {
    setLayers({
      current: { icon, gen: layers.current.gen + 1 },
      previous: layers.current,
    });
  }

  return (
    <Animated.View style={{ width: size, height: size }}>
      {layers.previous ? (
        <IconLayer
          key={layers.previous.gen}
          icon={layers.previous.icon}
          direction="out"
          color={color}
          size={size}
          strokeWidth={strokeWidth}
        />
      ) : null}
      <IconLayer
        key={layers.current.gen}
        icon={layers.current.icon}
        direction={layers.current.gen === 0 ? 'static' : 'in'}
        color={color}
        size={size}
        strokeWidth={strokeWidth}
      />
    </Animated.View>
  );
}
