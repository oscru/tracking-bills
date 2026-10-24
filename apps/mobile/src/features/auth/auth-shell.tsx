import { ICON_COLORS, Screen, StaggerItem, useIsDesktop } from '@repo/ui';
import { Moon, Sun } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { setSignedOutTheme } from '../settings/theme-sync';

/** The desktop split screen's largest size; past it, canvas around it. */
const DESKTOP_FRAME = { width: 1440, height: 960 };

/**
 * Layout for the auth screens. Desktop web: a split screen — a lime brand
 * "poster" on the left (big ink headline + tilted movement stickers), the
 * form on the right. Phones and narrow windows: just the logo above the
 * form — nothing else competing with it (the poster and the theme switch
 * are desktop-only; on a phone the system theme rules).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();

  if (desktop) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-canvas-dark">
        {/* Capped and centered: on a big monitor the poster would otherwise
            stretch edge to edge and leave the form adrift in the other half. */}
        <View
          className="w-full flex-1 flex-row p-4"
          style={{ maxWidth: DESKTOP_FRAME.width, maxHeight: DESKTOP_FRAME.height }}
        >
          <View style={{ flex: 1.1, minHeight: 0 }}>
            <PosterPanel />
          </View>
          <View className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerClassName="grow items-center justify-center px-10 py-12"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="w-full gap-6" style={{ maxWidth: 400 }}>
                {children}
              </View>
            </ScrollView>
            <View className="absolute right-4 top-4">
              <ThemeToggle />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Screen center scroll>
      <View className="gap-6">
        <StaggerItem index={0}>
          <View className="pb-2">
            <BrandMark />
          </View>
        </StaggerItem>
        {children}
      </View>
    </Screen>
  );
}

/** Sun/moon switch between light and dark, remembered while signed out. */
function ThemeToggle() {
  const { t } = useTranslation('auth');
  const dark = useColorScheme().colorScheme === 'dark';
  return (
    <Pressable
      onPress={(e) =>
        setSignedOutTheme(dark ? 'light' : 'dark', {
          x: e.nativeEvent.pageX,
          y: e.nativeEvent.pageY,
        })
      }
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t(dark ? 'theme.useLight' : 'theme.useDark')}
      className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
    >
      {dark ? (
        <Sun size={20} color={ICON_COLORS.inkDark} />
      ) : (
        <Moon size={20} color={ICON_COLORS.ink} />
      )}
    </Pressable>
  );
}

// The app icon (same artwork as the web favicon).
const BRAND_ICON = require('../../../assets/images/brand-icon.png') as number;

/**
 * The app icon + wordmark. On the lime poster, an ink tile with a lime "G"
 * instead — the (lime) icon would vanish into it.
 */
function BrandMark({ onLime = false }: { onLime?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5">
      {onLime ? (
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-ink">
          <Text className="text-lg font-black text-lime">G</Text>
        </View>
      ) : (
        <Image source={BRAND_ICON} style={{ width: 40, height: 40, borderRadius: 12 }} />
      )}
      <Text
        className={`text-lg font-bold tracking-tight ${onLime ? 'text-ink' : 'text-ink dark:text-ink-dark'}`}
      >
        Genobills
      </Text>
    </View>
  );
}

/* ---------------------------------------------------------------------------
 * Stickers — movement chips tilted like they were slapped on the poster
 * ------------------------------------------------------------------------- */

type StickerProps = {
  emoji: string;
  label: string;
  amount: string;
  income?: boolean;
  /** `ink` (default) or a white sticker for contrast. */
  tone?: 'ink' | 'white';
  rotate: number;
  style?: ViewStyle;
};

const STICKER_SHADOW: ViewStyle = {
  shadowColor: '#1A1D21',
  shadowOpacity: 0.25,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};

function Sticker({ emoji, label, amount, income, tone = 'ink', rotate, style }: StickerProps) {
  const white = tone === 'white';
  return (
    <View
      className={`flex-row items-center gap-3 self-start rounded-full py-2.5 pl-2.5 pr-5 ${white ? 'bg-white' : 'bg-ink'}`}
      style={[STICKER_SHADOW, { transform: [{ rotate: `${rotate}deg` }] }, style]}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-full ${white ? 'bg-canvas' : 'bg-white/10'}`}
      >
        <Text className="text-xl">{emoji}</Text>
      </View>
      <View>
        <Text className={`text-sm font-semibold ${white ? 'text-ink-2' : 'text-white/60'}`}>
          {label}
        </Text>
        <Text
          className={`text-lg font-bold tracking-tight ${
            income ? (white ? 'text-pos' : 'text-lime') : white ? 'text-ink' : 'text-white'
          }`}
        >
          {amount}
        </Text>
      </View>
    </View>
  );
}

/** Big concentric rings bleeding off a corner — the poster's only ornament. */
function Rings({ size, style }: { size: number; style: ViewStyle }) {
  const c = size / 2;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {[0.98, 0.74, 0.5].map((r) => (
          <Circle
            key={r}
            cx={c}
            cy={c}
            r={c * r}
            stroke="#1A1D21"
            strokeOpacity={0.09}
            strokeWidth={1.5}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

/* ---------------------------------------------------------------------------
 * Desktop poster
 * ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * Easter egg: the feature tags switch the sticker set, and a tapped sticker
 * spins away. Desktop poster only.
 * ------------------------------------------------------------------------- */

type StickerLook = Pick<StickerProps, 'emoji' | 'income' | 'tone'>;

/**
 * Each feature tag's four stickers: their look here, their text (label and
 * amount — amounts in the language's own currency and wording) in
 * `auth:poster.stickers`, in the same order.
 */
const STICKER_LOOKS = {
  expenses: [
    { emoji: '🌮' },
    { emoji: '💸', income: true },
    { emoji: '🛒', tone: 'white' },
    { emoji: '⛽' },
  ],
  budgets: [{ emoji: '🍽️' }, { emoji: '🚌' }, { emoji: '🎬', tone: 'white' }, { emoji: '🏠' }],
  goals: [
    { emoji: '🎯' },
    { emoji: '🛟', income: true },
    { emoji: '💻', tone: 'white' },
    { emoji: '🎁', income: true },
  ],
  shared: [
    { emoji: '🏡' },
    { emoji: '🍕', income: true },
    { emoji: '✈️', tone: 'white' },
    { emoji: '🧾' },
  ],
} satisfies Record<string, StickerLook[]>;

type Feature = keyof typeof STICKER_LOOKS;
const FEATURES = Object.keys(STICKER_LOOKS) as Feature[];

/** Where each of a set's four stickers sits, and its tilt. */
const SLOTS: { pos: ViewStyle; rotate: number }[] = [
  { pos: { top: 0, left: 0 }, rotate: -6 },
  { pos: { top: 18, left: '46%' }, rotate: 5 },
  { pos: { top: 104, left: '10%' }, rotate: -2 },
  { pos: { top: 120, left: '62%' }, rotate: 8 },
];

/** A sticker that, when tapped, spins away — shrinking and fading as it turns. */
function SpinAwaySticker({ onGone, ...sticker }: StickerProps & { onGone: () => void }) {
  const { t } = useTranslation('auth');
  const progress = useSharedValue(0);
  const [gone, setGone] = useState(false);
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ rotate: `${progress.value * 540}deg` }, { scale: 1 - progress.value * 0.85 }],
  }));

  return (
    <Animated.View style={animated} pointerEvents={gone ? 'none' : 'auto'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('poster.remove', { label: sticker.label })}
        disabled={gone}
        onPress={() => {
          setGone(true);
          onGone();
          progress.value = withTiming(1, { duration: 600, easing: Easing.in(Easing.back(1.4)) });
        }}
      >
        <Sticker {...sticker} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Web: `overflow: hidden` still lets the browser scroll the panel to bring
 * a focused element into view (tabbing to a sticker shifted the whole
 * poster up). `clip` can't be scrolled at all.
 */
const WEB_CLIP = (Platform.OS === 'web' ? { overflow: 'clip' } : {}) as unknown as ViewStyle;

function PosterPanel() {
  const { t } = useTranslation('auth');
  // Scales down on short windows so the poster never outgrows the viewport.
  const { height } = useWindowDimensions();
  const roomy = height >= 860;
  const showStickers = height >= 720;
  const headline = roomy ? 76 : 60;

  const [feature, setFeature] = useState(FEATURES[0]!);
  // Bumped on every tag tap, so tapping the active tag also brings its
  // stickers back (they remount, keyed by it).
  const [round, setRound] = useState(0);
  const [goneCount, setGoneCount] = useState(0);
  const texts = t(`poster.stickers.${feature}`, { returnObjects: true });
  const stickers = STICKER_LOOKS[feature].map((look, i) => ({ ...look, ...texts[i]! }));

  return (
    <View
      className="flex-1 justify-between overflow-hidden rounded-[32px] bg-lime"
      style={[{ padding: roomy ? 48 : 40 }, WEB_CLIP]}
    >
      <Rings size={620} style={{ top: -240, right: -220 }} />
      <Rings size={420} style={{ bottom: -200, left: -160 }} />

      <BrandMark onLime />

      <View className="gap-4">
        <Text
          className="font-black text-ink"
          style={{ fontSize: headline, lineHeight: headline * 0.98, letterSpacing: -2.5 }}
        >
          {t('poster.headline')}
        </Text>
        <Text className="max-w-[400px] text-lg font-medium leading-7 text-ink/70">
          {t('poster.body')}
        </Text>
      </View>

      {showStickers ? (
        <View key={round} style={{ height: 190 }}>
          {stickers.map((sticker, i) => (
            <View key={sticker.label} style={{ position: 'absolute', ...SLOTS[i]!.pos }}>
              <StaggerItem index={i}>
                <SpinAwaySticker
                  {...sticker}
                  rotate={SLOTS[i]!.rotate}
                  onGone={() => setGoneCount((n) => n + 1)}
                />
              </StaggerItem>
            </View>
          ))}
          {goneCount >= stickers.length ? (
            <Animated.View
              entering={FadeIn.delay(450).duration(400)}
              style={{ position: 'absolute', top: 70, left: 0, right: 0, alignItems: 'center' }}
            >
              <Text className="text-xl font-bold text-ink">{t('poster.cleared')}</Text>
              <Text className="text-sm font-medium text-ink/60">{t('poster.clearedHint')}</Text>
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {FEATURES.map((f) => {
          const active = f === feature;
          return (
            <Pressable
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setFeature(f);
                setRound((r) => r + 1);
                setGoneCount(0);
              }}
              className={`rounded-full border px-3.5 py-1.5 active:opacity-70 ${active ? 'border-ink bg-ink' : 'border-ink/15'}`}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-lime' : 'text-ink/80'}`}>
                {t(`poster.features.${f}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
