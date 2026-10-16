import { Platform } from 'react-native';

/**
 * Web-only DOM tweaks that the Expo SPA shell (`output: "single"`) does not let
 * us set through `+html.tsx` (that file is only honoured by static rendering).
 * Runs once at module load, before React mounts.
 *
 * Goal: when the mobile browser's on-screen keyboard opens it must SHRINK the
 * layout so inputs / buttons stay reachable, instead of floating over the UI.
 *   - `interactive-widget=resizes-content` -> browser resizes the layout
 *     viewport when the keyboard shows.
 *   - `overflow: auto` on <body> -> the shrunk content can actually scroll
 *     (Expo's reset locks it to `hidden`).
 */
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.lang = 'es';

  const viewport = document.querySelector('meta[name="viewport"]');
  const content =
    'width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content';
  if (viewport) {
    viewport.setAttribute('content', content);
  } else {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = content;
    document.head.appendChild(meta);
  }

  const style = document.createElement('style');
  style.textContent = `
    html, body { height: 100%; }
    body { overflow: auto; overscroll-behavior-y: none; }
    #root { display: flex; min-height: 100%; flex: 1 1 auto; }
    /* Text fields draw their own focus state (a thicker border on the
       wrapper, see TextField) — drop the browser's ring on the inner
       <input>, which showed as a second, inset box. */
    input, textarea { outline: none; }
  `;
  document.head.appendChild(style);
}

/**
 * Dev-only: silence React DOM's "Unknown event handler property
 * `onStartShouldSetResponder`" (and `onPressIn`/`onPressOut`/`onLongPress`)
 * warning. `react-native-gifted-charts` puts RN touch-responder and press
 * props (for its interactive pointer, which the app doesn't use) on Views
 * that react-native-web hands straight to a <div>. Harmless —
 * the chart renders fine and React never logs this in production builds —
 * but it popped the dev error overlay on every screen with a line chart.
 * Only that exact warning, for those props, is dropped.
 */
if (Platform.OS === 'web' && __DEV__) {
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Unknown event handler property') &&
      typeof args[1] === 'string' &&
      /^on(\w*Responder\w*|PressIn|PressOut|LongPress)$/.test(args[1])
    ) {
      return;
    }
    consoleError(...args);
  };
}
