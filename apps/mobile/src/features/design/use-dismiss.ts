import { useEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';

/**
 * Web: while `open`, calls `onDismiss` on Escape or on a press outside every
 * element in `refs` (the popover itself, and the button that toggles it —
 * leaving the button out would close the popover on press-down and the
 * button's own press would reopen it). No-op on native, where popovers
 * close through their own controls.
 *
 * `refs` point at React Native views; on web those are DOM elements.
 */
export function useDismiss(open: boolean, onDismiss: () => void, refs: RefObject<unknown>[]) {
  // Latest callback and refs without re-subscribing every render.
  const latest = useRef({ onDismiss, refs });
  useEffect(() => {
    latest.current = { onDismiss, refs };
  });

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof document === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      latest.current.onDismiss();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const inside = latest.current.refs.some((ref) => {
        const node = ref.current as Node | null;
        return node != null && target != null && node.contains?.(target);
      });
      if (!inside) latest.current.onDismiss();
    };

    document.addEventListener('keydown', onKeyDown);
    // Capture phase: runs even if something inside stops the event.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);
}
