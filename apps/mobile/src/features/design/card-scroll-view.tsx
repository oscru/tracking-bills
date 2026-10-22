import { useEffect, useRef, type ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * A scroll area for lists inside a card, with its own small scrollbar: a
 * 3px rounded thumb on the right edge whose length shows how much of the
 * list is visible and whose position shows where you are. Only there when
 * the list overflows; a touch brighter while scrolling. Replaces the
 * platform indicator (on web, the browser's own scrollbar — chunky and grey
 * on Windows).
 *
 * `className` sizes the area (e.g. `flex-1`, or `shrink grow-0` to fit its
 * content and only shrink when there's no room); the list inside follows.
 * `gutter` keeps the content clear of the bar — off for lists whose rows
 * already have side padding. `barInPadding` instead puts the bar out in the
 * card's own padding (that many px of it), so the content still reaches
 * the card's content edge — lined up with the header above it.
 */
export function CardScrollView({
  className,
  contentContainerClassName,
  gutter = true,
  barInPadding,
  style,
  children,
  ...props
}: Omit<ScrollViewProps, 'onScroll' | 'onLayout' | 'onContentSizeChange' | 'style'> & {
  className?: string;
  /** On the area (like `className`), not the list inside. */
  style?: StyleProp<ViewStyle>;
  contentContainerClassName?: string;
  gutter?: boolean;
  barInPadding?: number;
  children: ReactNode;
}) {
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);
  const offset = useSharedValue(0);
  const active = useSharedValue(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    },
    [],
  );

  const thumbStyle = useAnimatedStyle(() => {
    const h = viewport.get();
    const c = content.get();
    if (h <= 0 || c <= h + 1) return { opacity: 0, height: 0, transform: [{ translateY: 0 }] };
    // The track is inset 4px top and bottom.
    const track = h - 8;
    const thumb = Math.max(24, (track * h) / c);
    const progress = Math.min(1, Math.max(0, offset.get() / (c - h)));
    return {
      height: thumb,
      opacity: 0.35 + active.get() * 0.4,
      transform: [{ translateY: progress * (track - thumb) }],
    };
  });

  return (
    <View
      className={`relative ${className ?? ''}`}
      style={[barInPadding ? { marginRight: -barInPadding } : null, style]}
    >
      <ScrollView
        // Sizes to its content, shrinking (and scrolling) when the area is smaller.
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerClassName={contentContainerClassName}
        contentContainerStyle={
          barInPadding ? { paddingRight: barInPadding } : gutter ? { paddingRight: 14 } : undefined
        }
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(e) => viewport.set(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => content.set(h)}
        onScroll={(e) => {
          offset.set(e.nativeEvent.contentOffset.y);
          active.set(withTiming(1, { duration: 120 }));
          if (idleTimer.current) clearTimeout(idleTimer.current);
          idleTimer.current = setTimeout(() => active.set(withTiming(0, { duration: 400 })), 700);
        }}
        {...props}
      >
        {children}
      </ScrollView>
      <View pointerEvents="none" className="absolute bottom-1 right-0.5 top-1 w-[3px]">
        <Animated.View
          style={[{ width: 3, borderRadius: 2, backgroundColor: '#9CA3AF' }, thumbStyle]}
        />
      </View>
    </View>
  );
}
