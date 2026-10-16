import { createContext, useContext, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { BackButton } from './back-button';

export interface PageHeaderProps {
  title: string;
  onBack: () => void;
  /** Trailing control (e.g. an `IconButton`) — same slot idea as `BottomSheet`'s `headerAction`. */
  action?: ReactNode;
}

/**
 * `false` hides the back arrow of every `PageHeader` below — for screens
 * shown in a pane next to the list they came from (desktop master–detail),
 * where there's nothing to go "back" to.
 */
export const PageHeaderBackContext = createContext(true);

/** Back arrow + page title on one line — the standard top-of-page header. */
export function PageHeader({ title, onBack, action }: PageHeaderProps) {
  const showBack = useContext(PageHeaderBackContext);
  return (
    <View className="flex-row items-center gap-3">
      {showBack ? <BackButton onPress={onBack} /> : null}
      <Text className="flex-1 text-2xl font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
        {title}
      </Text>
      {action}
    </View>
  );
}
