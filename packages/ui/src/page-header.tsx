import { Text, View } from 'react-native';

import { BackButton } from './back-button';

export interface PageHeaderProps {
  title: string;
  onBack: () => void;
}

/** Back arrow + page title on one line — the standard top-of-page header. */
export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <View className="flex-row items-center gap-3 pt-2">
      <BackButton onPress={onBack} />
      <Text className="flex-1 text-2xl font-bold text-ink dark:text-ink-dark" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}
