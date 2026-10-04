import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Live keyboard height in px — 0 when hidden, and always 0 on iOS (where
 * `KeyboardAvoidingView`'s own `"padding"` behavior already handles this
 * reliably via layout measurement).
 *
 * Android-only: `KeyboardAvoidingView`'s `"height"`/`"position"` behaviors
 * rely on measuring their own layout when the keyboard opens, and that
 * measurement doesn't reliably fire when nested inside an Expo Router
 * native-stack screen (a known `react-native-screens` limitation — the
 * screen container doesn't always propagate the resize). Listening to the
 * native `Keyboard` show/hide events directly sidesteps that: it doesn't
 * depend on any layout measurement, only on the OS event firing, which it
 * always does.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
