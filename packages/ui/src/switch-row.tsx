import { Switch, Text, useColorScheme, View } from 'react-native';

export interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** A labeled on/off row — a `Switch` styled to the "Lima + tinta" accent. */
export function SwitchRow({ label, description, value, onValueChange }: SwitchRowProps) {
  const dark = useColorScheme() === 'dark';
  return (
    <View className="flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 py-3 dark:border-line-dark dark:bg-surface-dark">
      <View className="flex-1 pr-3">
        <Text className="text-base text-ink dark:text-ink-dark">{label}</Text>
        {description ? (
          <Text className="mt-0.5 text-[12px] text-ink-2 dark:text-ink-2-dark">{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: dark ? '#23272C' : '#E3E5E8', true: '#B9F227' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={dark ? '#23272C' : '#E3E5E8'}
      />
    </View>
  );
}
