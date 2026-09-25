import { tagCreateSchema, type TagCreateInput } from '@repo/core/validators';
import { Button, ColorPicker, ErrorCard, TextField } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CATEGORY_COLORS } from '../categories/color-picker';

export interface TagFormInitial {
  name?: string;
  color?: string | null;
}

interface Props {
  initial?: TagFormInitial;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: TagCreateInput) => void;
  /** Called when the name changes — the parent should clear its `error` (e.g. "ya existe una tag con ese nombre") so it doesn't linger once the user starts fixing it. */
  onDirty?: () => void;
  footer?: ReactNode;
}

export function TagForm({ initial, submitLabel, submitting, error, onSubmit, onDirty, footer }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [nameError, setNameError] = useState<string | undefined>();

  const submit = () => {
    setNameError(undefined);
    const parsed = tagCreateSchema.safeParse({ name, color });
    if (!parsed.success) {
      setNameError(parsed.error.flatten().fieldErrors.name?.[0]);
      return;
    }
    onSubmit(parsed.data);
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-8" keyboardShouldPersistTaps="handled">
      <TextField
        label="Nombre"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError(undefined);
          onDirty?.();
        }}
        placeholder="Ej. Vacaciones"
        error={nameError}
        invalid={Boolean(error)}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Color</Text>
        <ColorPicker value={color} onChange={setColor} colors={CATEGORY_COLORS} />
      </View>

      <ErrorCard message={error} />

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}
    </ScrollView>
  );
}
