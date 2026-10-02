import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p) => /[0-9]/.test(p) },
  { label: 'Un carácter especial (!@#$...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  return (
    <View className="gap-1.5 rounded-ctl border border-line bg-canvas p-3 dark:border-line-dark dark:bg-canvas-dark">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View key={rule.label} className="flex-row items-center gap-2">
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={met ? '#4D7C0F' : '#9CA3AF'}
            />
            <Text
              className={`text-xs ${met ? 'text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'}`}
            >
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
