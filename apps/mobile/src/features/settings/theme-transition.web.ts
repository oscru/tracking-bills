import { flushSync } from 'react-dom';

import type { TransitionOrigin } from './theme-transition';

export type { TransitionOrigin };

const DURATION_MS = 560;
const STYLE_ID = 'theme-transition-style';

/**
 * The browser's default view transition cross-fades old and new snapshots;
 * turn that off so only our clip-path reveal animates the new one on top.
 */
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ::view-transition-old(root),
    ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
  `;
  document.head.appendChild(style);
}

/**
 * Web: switches the theme inside a View Transition and reveals the new one
 * in a circle growing from `origin` (the tapped button) to the farthest
 * corner. `flushSync` makes React re-render the JS-picked colors (icons,
 * charts) inside the callback, so the "new" snapshot already has them —
 * otherwise they'd pop in after the reveal.
 *
 * Falls back to an instant switch without View Transitions support or with
 * reduced motion on.
 */
export function withThemeTransition(apply: () => void, origin?: TransitionOrigin) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduced) {
    apply();
    return;
  }

  ensureStyle();
  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 40;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = doc.startViewTransition(() => {
    flushSync(apply);
  });
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: DURATION_MS,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {});
}
