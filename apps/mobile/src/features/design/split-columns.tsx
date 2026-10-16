import { useIsDesktop } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * A detail screen's two halves: side by side on desktop web when there's
 * room (the headline card on the left, everything else on the right),
 * stacked otherwise — on phones, and in a narrow desktop pane (a detail
 * opened beside its list), where they read top to bottom as on a phone.
 */
export function SplitColumns({
  left,
  right,
  leftWidth,
  rightWidth,
  minWidth = 640,
}: {
  left: ReactNode;
  right: ReactNode;
  /** Desktop width of the left column; the right one takes the rest (default 420). */
  leftWidth?: number;
  /** Fix the right column instead, when the left one (a chart) should grow. */
  rightWidth?: number;
  /** Below this available width (px) the halves stack. */
  minWidth?: number;
}) {
  const desktop = useIsDesktop();
  const [width, setWidth] = useState<number | null>(null);
  const measure = (w: number) => setWidth(Math.round(w));
  if (!desktop) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  // Split until measured (the usual desktop case), then by the room there is.
  if (width != null && width < minWidth) {
    return (
      <View onLayout={(e) => measure(e.nativeEvent.layout.width)} className="gap-5">
        {left}
        {right}
      </View>
    );
  }
  return (
    <View
      onLayout={(e) => measure(e.nativeEvent.layout.width)}
      className="flex-row items-start gap-6"
    >
      <View
        style={rightWidth ? undefined : { width: leftWidth ?? 420 }}
        className={rightWidth ? 'flex-1 gap-5' : 'gap-5'}
      >
        {left}
      </View>
      <View
        style={rightWidth ? { width: rightWidth } : undefined}
        className={rightWidth ? 'gap-5' : 'flex-1 gap-5'}
      >
        {right}
      </View>
    </View>
  );
}
