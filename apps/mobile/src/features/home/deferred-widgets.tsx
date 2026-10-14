import { Skeleton } from '@repo/ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

/**
 * How many of `total` items to render right now: `initial` on the first
 * frame, then one more per frame until all are in. Lets a screen paint what's
 * on screen first and mount the rest (charts, lists…) right after, instead of
 * paying for everything before the first frame.
 */
export function useProgressiveCount(total: number, initial: number) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    if (count >= total) return;
    // After the next frame is drawn, so each step lands in its own frame and
    // never blocks the one before it.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setCount((c) => c + 1), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [count, total]);
  return Math.min(count, total);
}

/** Stands in for a Home widget that hasn't mounted yet — a card of about its size. */
export function WidgetPlaceholder() {
  return (
    <View
      className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark"
      style={{ height: 200 }}
    >
      <Skeleton width={130} height={13} />
      <Skeleton width="100%" height={110} radius={12} />
    </View>
  );
}
