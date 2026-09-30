import { useProfile } from '@repo/core/hooks';
import { colorScheme } from 'nativewind';
import { useEffect } from 'react';

/**
 * Applies the profile's theme preference to NativeWind's imperative color
 * scheme as soon as it loads or changes — mounted once above the app's
 * screens. `colorScheme.set` is a real side effect (it updates a NativeWind
 * context outside this component), so it has to run in a `useEffect`, not
 * during render — calling it during render updates another component while
 * this one is still rendering, which React rejects.
 */
export function ThemeSync() {
  const { data: profile } = useProfile();
  const preference = profile?.theme_preference;

  useEffect(() => {
    if (preference) colorScheme.set(preference);
  }, [preference]);

  return null;
}
