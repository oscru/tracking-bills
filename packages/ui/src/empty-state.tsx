import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

export interface EmptyStateProps {
  /** One of the `*EmptyIllustration` components from `empty-state-illustrations`. */
  illustration: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

/** Illustration + title + description for an empty list — the one layout
 * every "no X yet" screen (tags, accounts, budgets, goals, categories,
 * transactions) renders instead of a bare message. Grows to fill the
 * remaining space of its flex column and centers itself in it — the parent
 * (or, for a list's `ListEmptyComponent`, its content container) needs
 * `flex-1`/`grow` for that centering to have room to happen in. The
 * illustration fades/scales in with a small bounce on mount. */
export function EmptyState({ illustration, title, description, className }: EmptyStateProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 10,
      bounciness: 10,
    }).start();
  }, [progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  return (
    <View className={`items-center justify-center gap-3 ${className ?? 'flex-1'}`}>
      <Animated.View style={{ opacity: progress, transform: [{ scale }] }}>
        {illustration}
      </Animated.View>
      <View className="items-center gap-1">
        <Text className="text-base font-semibold text-ink dark:text-ink-dark">{title}</Text>
        {description ? (
          <Text className="max-w-[260px] text-center text-sm text-ink-2 dark:text-ink-2-dark">
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
