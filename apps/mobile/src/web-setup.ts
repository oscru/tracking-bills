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
  `;
  document.head.appendChild(style);
}
