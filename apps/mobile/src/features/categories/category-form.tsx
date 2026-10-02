import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '@repo/core/hooks';
import { resolveCategoryLabel } from '@repo/core/i18n';
import type { CategoryType } from '@repo/core/types';
import { categoryCreateSchema, type CategoryCreateInput } from '@repo/core/validators';
import { Button, CategoryDot, Chip, ColorPicker, ErrorCard, TextField } from '@repo/ui';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { IconPicker } from '../favorites/icon-picker';
import { CATEGORY_COLORS } from './color-picker';
import { CategoryPicker } from './category-picker';

export interface CategoryFormInitial {
  id?: string;
  name?: string;
  type?: CategoryType;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null;
}

interface Props {
  initial?: CategoryFormInitial;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: CategoryCreateInput) => void;
  /** Called when the name changes — the parent should clear its `error` so it doesn't linger once the user starts fixing it. */
  onDirty?: () => void;
  footer?: ReactNode;
}

export function CategoryForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onDirty,
  footer,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<CategoryType>(initial?.type ?? 'expense');
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [parentId, setParentId] = useState<string | null>(initial?.parent_id ?? null);
  const [parentOpen, setParentOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  const { data: categories } = useCategories();
  const parent = (categories ?? []).find((c) => c.id === parentId) ?? null;
  // Changing type with subcategories already under it has no sensible
  // resolution (a subcategory like "Restaurantes" doesn't mean anything as
  // income just because its parent "Comida" became one) — the DB rejects it
  // outright (`check_category_parent`), so lock it here instead of letting
  // the user hit a raw error after filling out the rest of the form.
  const hasSubcategories = Boolean(
    initial?.id && (categories ?? []).some((c) => c.parent_id === initial.id),
  );

  const submit = () => {
    setNameError(undefined);
    const parsed = categoryCreateSchema.safeParse({ name, type, icon, color, parent_id: parentId });
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
      <View className="items-center gap-2">
        <Pressable
          onPress={() => setIconPickerOpen(true)}
          className="h-16 w-16 items-center justify-center rounded-full bg-lime-tint dark:bg-lime-tint-dark"
        >
          <Ionicons
            name={(icon as keyof typeof Ionicons.glyphMap) ?? 'pricetag-outline'}
            size={26}
            color="#4D7C0F"
          />
        </Pressable>
        <Pressable onPress={() => setIconPickerOpen(true)} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            {icon ? 'Cambiar ícono' : 'Elegir ícono'}
          </Text>
        </Pressable>
      </View>

      <TextField
        label="Nombre"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError(undefined);
          onDirty?.();
        }}
        placeholder="Ej. Mascota"
        error={nameError}
        invalid={Boolean(error)}
      />

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Tipo</Text>
        <View className={`flex-row gap-2 ${hasSubcategories ? 'opacity-50' : ''}`}>
          <Chip
            label="Gasto"
            selected={type === 'expense'}
            disabled={hasSubcategories}
            onPress={() => {
              setType('expense');
              setParentId(null);
            }}
          />
          <Chip
            label="Ingreso"
            selected={type === 'income'}
            disabled={hasSubcategories}
            onPress={() => {
              setType('income');
              setParentId(null);
            }}
          />
        </View>
        {hasSubcategories ? (
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            No puedes cambiar el tipo mientras tenga subcategorías. Muévelas o elimínalas primero.
          </Text>
        ) : null}
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">
          Categoría superior (opcional)
        </Text>
        <Pressable
          onPress={() => setParentOpen(true)}
          className="h-[52px] flex-row items-center justify-between rounded-ctl border border-line bg-surface px-3.5 dark:border-line-dark dark:bg-surface-dark"
        >
          <View className="flex-row items-center gap-2">
            {parent ? <CategoryDot color={parent.color} icon={parent.icon} size={16} /> : null}
            <Text className="text-base text-ink dark:text-ink-dark">
              {parent ? resolveCategoryLabel(parent) : 'Ninguna'}
            </Text>
          </View>
          <Text className="text-[13px] font-semibold text-lime-ink dark:text-lime-ink-dark">
            Elegir ›
          </Text>
        </Pressable>
        {parentId ? (
          <Text className="text-xs text-ink-3 dark:text-ink-3-dark">
            Se creará como subcategoría (hereda el tipo).
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-ink-2 dark:text-ink-2-dark">Color</Text>
        <ColorPicker value={color} onChange={setColor} colors={CATEGORY_COLORS} />
      </View>

      <ErrorCard message={error} />

      <Button label={submitLabel} onPress={submit} loading={submitting} />

      {footer}

      <CategoryPicker
        visible={parentOpen}
        onClose={() => setParentOpen(false)}
        type={type}
        parentOnly
        excludeId={initial?.id}
        selectedId={parentId}
        onSelect={setParentId}
      />
      <IconPicker
        visible={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        value={icon}
        onSelect={(name) => {
          setIcon(name);
          onDirty?.();
        }}
      />
    </ScrollView>
  );
}
