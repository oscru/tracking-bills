import { Ionicons } from '@expo/vector-icons';
import type { AccountType } from '@repo/core/types';
import { ICON_COLORS } from '@repo/ui';
import { useColorScheme } from 'nativewind';
import { View } from 'react-native';

import { ACCOUNT_TYPE_ICON } from './account-types';

interface AccountIconProps {
  account: { type: AccountType; color?: string | null };
  /** Circle diameter; the glyph scales with it. */
  size?: number;
}

/**
 * An account's type glyph on a soft tile of its own color — the one account
 * indicator used everywhere accounts are listed (Inicio's "Tus cuentas",
 * Cuentas, the account picker, filters). Accounts without a color get the
 * lime tint.
 */
export function AccountIcon({ account, size = 36 }: AccountIconProps) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const { color, type } = account;

  return (
    <View
      className={`items-center justify-center rounded-full ${
        color ? '' : 'bg-lime-tint dark:bg-lime-tint-dark'
      }`}
      style={[
        { width: size, height: size },
        // `26` hex = ~15% alpha over the account's own color.
        color ? { backgroundColor: `${color}26` } : null,
      ]}
    >
      <Ionicons
        name={ACCOUNT_TYPE_ICON[type]}
        size={Math.round(size * 0.45)}
        color={color ?? (dark ? ICON_COLORS.limeInkDark : ICON_COLORS.limeInk)}
      />
    </View>
  );
}
