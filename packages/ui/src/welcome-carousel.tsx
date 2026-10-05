import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './button';
import { useSheetPortalRegister } from './sheet-portal';

export interface WelcomeCarouselSlide {
  illustration: ReactNode;
  title: string;
  description: string;
}

export interface WelcomeCarouselProps {
  visible: boolean;
  slides: WelcomeCarouselSlide[];
  onDone: () => void;
}

const { width: WINDOW_WIDTH } = Dimensions.get('window');

function Dots({
  count,
  index,
}: {
  count: number;
  index: Animated.Value | Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const width = index.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [8, 20, 8],
          extrapolate: 'clamp',
        });
        const opacity = index.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            className="h-2 rounded-full bg-lime"
            style={{ width, opacity }}
          />
        );
      })}
    </View>
  );
}

function CarouselBody({ slides, onDone }: Omit<WelcomeCarouselProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = index === slides.length - 1;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / WINDOW_WIDTH));
  };

  const goNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * WINDOW_WIDTH, animated: true });
  };

  return (
    <View className="flex-1 bg-canvas dark:bg-canvas-dark" style={{ paddingTop: insets.top }}>
      <Pressable
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel="Omitir"
        className="absolute right-5 z-10 px-3 py-2"
        style={{ top: insets.top + 8 }}
      >
        <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Omitir</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
      >
        {slides.map((slide, i) => (
          <View key={i} style={{ width: WINDOW_WIDTH }} className="flex-1 items-center justify-center gap-6 px-8">
            {slide.illustration}
            <View className="items-center gap-2">
              <Text className="text-center text-2xl font-extrabold text-ink dark:text-ink-dark">
                {slide.title}
              </Text>
              <Text className="max-w-[280px] text-center text-base text-ink-2 dark:text-ink-2-dark">
                {slide.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="gap-5 px-8" style={{ paddingBottom: insets.bottom + 16 }}>
        <Dots count={slides.length} index={scrollX.interpolate({
          inputRange: [0, WINDOW_WIDTH],
          outputRange: [0, 1],
        })} />
        <Button label={isLast ? 'Comenzar' : 'Siguiente'} onPress={goNext} />
      </View>
    </View>
  );
}

/**
 * Full-screen, opaque welcome carousel — shown once, right after signup
 * (gated on `profiles.has_seen_tour`, see `apps/mobile`'s `use-tour.ts`), and
 * replayable later from Settings. Portals into `<SheetPortalHost>` instead
 * of RN's `Modal`, same reasoning as `BottomSheet`: a `Modal` on Android can
 * render behind the app's own tab bar.
 */
export function WelcomeCarousel({ visible, slides, onDone }: WelcomeCarouselProps) {
  const id = useId();
  const register = useSheetPortalRegister();

  useEffect(() => {
    if (!visible) {
      register(id, null);
      return;
    }
    register(id, <CarouselBody slides={slides} onDone={onDone} />);
  }, [visible, slides, onDone, id, register]);

  useEffect(() => () => register(id, null), [id, register]);

  return null;
}
