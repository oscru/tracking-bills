import * as Haptics from 'expo-haptics';
import { Platform, Pressable, Text, View } from 'react-native';

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'clear'
  | 'back'
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'equals';

export interface NumericKeypadProps {
  onKey: (key: KeypadKey) => void;
}

type Kind = 'digit' | 'op' | 'equals';
interface Cell {
  key: KeypadKey;
  label: string;
  kind: Kind;
  grow?: number;
}

const rows: Cell[][] = [
  [
    { key: 'clear', label: 'C', kind: 'op' },
    { key: 'div', label: '÷', kind: 'op' },
    { key: 'mul', label: '×', kind: 'op' },
    { key: 'back', label: '⌫', kind: 'op' },
  ],
  [
    { key: '7', label: '7', kind: 'digit' },
    { key: '8', label: '8', kind: 'digit' },
    { key: '9', label: '9', kind: 'digit' },
    { key: 'sub', label: '−', kind: 'op' },
  ],
  [
    { key: '4', label: '4', kind: 'digit' },
    { key: '5', label: '5', kind: 'digit' },
    { key: '6', label: '6', kind: 'digit' },
    { key: 'add', label: '+', kind: 'op' },
  ],
  [
    { key: '1', label: '1', kind: 'digit' },
    { key: '2', label: '2', kind: 'digit' },
    { key: '3', label: '3', kind: 'digit' },
    { key: 'equals', label: '=', kind: 'equals' },
  ],
  [
    { key: '0', label: '0', kind: 'digit', grow: 2 },
    { key: '.', label: '.', kind: 'digit' },
  ],
];

const bg: Record<Kind, string> = {
  digit: 'bg-surface dark:bg-surface-dark',
  op: 'bg-lime-tint dark:bg-lime-tint-dark',
  equals: 'bg-lime',
};
const fg: Record<Kind, string> = {
  digit: 'text-ink dark:text-ink-dark',
  op: 'text-lime-ink dark:text-lime-ink-dark',
  equals: 'text-ink',
};

/**
 * In-app calculator keypad. Never renders a `TextInput`, so the OS keyboard
 * stays down on native. The parent owns the expression string.
 */
export function NumericKeypad({ onKey }: NumericKeypadProps) {
  const press = (key: KeypadKey) => {
    // No haptics engine on web; expo-haptics is native-only.
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onKey(key);
  };

  return (
    <View className="gap-2">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-2">
          {row.map((cell) => (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              accessibilityLabel={cell.label}
              onPress={() => press(cell.key)}
              style={{ flexGrow: cell.grow ?? 1, flexBasis: 0 }}
              className={`h-14 items-center justify-center rounded-ctl active:opacity-70 ${bg[cell.kind]}`}
            >
              <Text
                className={`${cell.kind === 'digit' ? 'text-2xl' : 'text-xl'} font-bold ${fg[cell.kind]}`}
              >
                {cell.label}
              </Text>
            </Pressable>
          ))}
          {row.length < 4 ? <View style={{ flexGrow: 1, flexBasis: 0 }} /> : null}
        </View>
      ))}
    </View>
  );
}
