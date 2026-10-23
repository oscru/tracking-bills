import { Circle, CircleCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { ICON_COLORS } from '@repo/ui';

const RULES = [
  { key: 'min', test: (p: string) => p.length >= 8 },
  { key: 'upper', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const { t } = useTranslation('auth');
  return (
    <View className="gap-1.5 rounded-ctl border border-line bg-canvas p-3 dark:border-line-dark dark:bg-canvas-dark">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View key={rule.key} className="flex-row items-center gap-2">
            {met ? (
              <CircleCheck size={16} color={ICON_COLORS.limeInk} />
            ) : (
              <Circle size={16} color={ICON_COLORS.ink3} />
            )}
            <Text
              className={`text-xs ${met ? 'text-ink dark:text-ink-dark' : 'text-ink-3 dark:text-ink-3-dark'}`}
            >
              {t(`passwordRules.${rule.key}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
