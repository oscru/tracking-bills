import type { TransactionType } from '@repo/core/types';
import { categoryCreateSchema, type CategoryCreateInput } from '@repo/core/validators';
import { Button, Chip, TextField } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CATEGORY_COLORS, ColorPicker } from './color-picker';

export interface CategoryFormInitial {
  name?: string;
  type?: TransactionType;
  color?: string | null;
}

interface Props {
  initial?: CategoryFormInitial;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: CategoryCreateInput) => void;
  footer?: ReactNode;
}

export function CategoryForm({ initial, submitLabel, submitting, error, onSubmit, footer }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [nameError, setNameError] = useState<string | undefined>();

  const submit = () => {
    setNameError(undefined);
    const parsed = categoryCreateSchema.safeParse({ name, type, color });
    if (!parsed.success) {
      setNameError(parsed.error.flatten().fieldErrors.name?.[0]);
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-5 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Ej. Mascota"
        error={nameError}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tipo</Text>
        <View className="flex-row gap-2">
          <Chip label="Gasto" selected={type === 'expense'} onPress={() => setType('expense')} />
          <Chip label="Ingreso" selected={type === 'income'} onPress={() => setType('income')} />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Color</Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}
    </ScrollView>
  );
}
