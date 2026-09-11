import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML for the web build. Key bit: `interactive-widget=resizes-content`
 * so the mobile browser shrinks the layout viewport when the on-screen
 * keyboard opens (instead of the keyboard covering inputs / buttons).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: bodyStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Full-height root, but let the body scroll when the viewport shrinks under the
// keyboard (the default Expo reset locks `overflow: hidden`).
const bodyStyle = `
html, body { height: 100%; }
body { overflow: auto; overscroll-behavior-y: none; }
#root { display: flex; min-height: 100%; flex: 1; }
`;
