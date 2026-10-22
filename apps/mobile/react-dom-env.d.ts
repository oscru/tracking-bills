// `react-dom` ships without types and only the web build touches it (see
// `features/settings/theme-transition.web.ts`) — declare just what's used.
declare module 'react-dom' {
  export function flushSync<R>(fn: () => R): R;
}
