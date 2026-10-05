import { useProfile, useUpdateProfile } from '@repo/core/hooks';

/**
 * `=== false` (never `!profile?.has_seen_tour`) so the carousel stays
 * unmounted — not flashed on — while the profile is still loading (`profile`
 * is `undefined` then, and `undefined === false` is `false`).
 */
export function useWelcomeCarousel() {
  const { data: profile } = useProfile();
  const { mutate } = useUpdateProfile();
  const visible = profile?.has_seen_tour === false;
  const onDone = () => mutate({ has_seen_tour: true });
  return { visible, onDone };
}
