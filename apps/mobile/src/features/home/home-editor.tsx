import { useUpdateProfile } from '@repo/core/hooks';
import type { Profile } from '@repo/core/types';
import {
  HOME_LAYOUT_ITEMS,
  addItem,
  compactUp,
  normalizeGrid,
  normalizeHomeLayout,
  toFriendlyMessage,
  type GridDevice,
  type GridItem,
  type HomeGrid,
  type HomeLayoutItem,
} from '@repo/core/utils';
import { BottomSheet, Button, ErrorCard, ICON_COLORS } from '@repo/ui';
import { Lock, Plus, RotateCcw } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { WIDGET_META } from './widget-catalog';

/**
 * Home's edit mode — the phone-home-screen way of customizing it, on the
 * widget matrix (`WidgetGrid`): move, resize, remove ("−") and add widgets
 * back. Each device keeps its own layout in `profiles.home_grid`; which
 * widgets are hidden (`home_hidden_items`) is shared.
 */

type Draft = { items: GridItem[]; hidden: HomeLayoutItem[] };

function storedGrid(profile: Profile | undefined): HomeGrid {
  const g = profile?.home_grid;
  return g && typeof g === 'object' && !Array.isArray(g) ? (g as HomeGrid) : {};
}

/** Builds the device's default layout: every widget, catalog order, default sizes. */
function defaultItems(device: GridDevice): GridItem[] {
  return normalizeGrid(null, device, HOME_LAYOUT_ITEMS, []);
}

export function useHomeEditor(profile: Profile | undefined, device: GridDevice) {
  const updateProfile = useUpdateProfile();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hidden = useMemo(
    () => (profile?.home_hidden_items ?? []) as HomeLayoutItem[],
    [profile?.home_hidden_items],
  );
  const saved = useMemo(
    () =>
      normalizeGrid(
        storedGrid(profile)[device],
        device,
        normalizeHomeLayout(profile?.home_layout),
        hidden,
      ),
    [profile, device, hidden],
  );

  const start = () => {
    if (profile) setDraft({ items: saved, hidden });
    setSaveError(null);
  };
  const cancel = () => {
    setDraft(null);
    setSaveError(null);
  };

  /**
   * Saves (when something changed) and leaves edit mode. The profile update
   * is optimistic, so Home doesn't flash back. If the save fails (rolled
   * back), edit mode comes back with the same draft and says so — instead of
   * the layout quietly reverting.
   */
  const done = () => {
    if (draft && profile) {
      const changed =
        JSON.stringify(draft.items) !== JSON.stringify(saved) ||
        draft.hidden.join() !== hidden.join();
      if (changed) {
        const attempted = draft;
        updateProfile.mutate(
          {
            home_grid: { ...storedGrid(profile), [device]: attempted.items },
            home_hidden_items: attempted.hidden,
          },
          {
            onError: (e) => {
              setDraft(attempted);
              setSaveError(toFriendlyMessage(e, 'No se pudo guardar tu inicio. Intenta de nuevo.'));
            },
          },
        );
      }
    }
    setDraft(null);
    setSaveError(null);
  };

  const setItems = (items: GridItem[]) => setDraft((d) => (d ? { ...d, items } : d));

  const remove = (id: HomeLayoutItem) =>
    setDraft((d) =>
      d
        ? {
            // The rest float up into the space it leaves.
            items: compactUp(d.items.filter((it) => it.id !== id)),
            hidden: d.hidden.includes(id) ? d.hidden : [...d.hidden, id],
          }
        : d,
    );

  /** Shows a hidden widget again, at its default size in the first spot it fits. */
  const add = (id: HomeLayoutItem) =>
    setDraft((d) =>
      d ? { items: addItem(d.items, id, device), hidden: d.hidden.filter((k) => k !== id) } : d,
    );

  const reset = () => setDraft((d) => (d ? { items: defaultItems(device), hidden: [] } : d));

  // Catalog order, so the list doesn't reshuffle as you add and remove.
  const available = useMemo(
    () => (draft ? HOME_LAYOUT_ITEMS.filter((k) => draft.hidden.includes(k)) : []),
    [draft],
  );

  return {
    editing: draft !== null,
    items: draft?.items ?? saved,
    saveError,
    available,
    start,
    cancel,
    done,
    setItems,
    remove,
    add,
    reset,
  };
}

/** Wraps the balance and month cards in edit mode: they can't move or go away. */
export function FixedInEdit({ editing, children }: { editing: boolean; children: ReactNode }) {
  if (!editing) return <>{children}</>;
  return (
    <View>
      <View pointerEvents="none" style={{ opacity: 0.3 }}>
        {children}
      </View>
      <View pointerEvents="none" className="absolute -top-2.5 right-4">
        <View className="flex-row items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 dark:border-line-dark dark:bg-surface-dark">
          <Lock size={11} color={ICON_COLORS.ink3} />
          <Text className="text-[11px] font-semibold text-ink-2 dark:text-ink-2-dark">Fijo</Text>
        </View>
      </View>
    </View>
  );
}

/** Top bar while editing: what's going on + Restablecer / Cancelar / Listo. */
export function EditToolbar({
  onDone,
  onCancel,
  onReset,
  compact,
  error,
  onOpenAdd,
  addCount,
}: {
  onDone: () => void;
  onCancel: () => void;
  onReset: () => void;
  /** Opens the floating list of widgets to add (`AddWidgetsSheet`). */
  onOpenAdd: () => void;
  /** How many hidden widgets can be added — shown on the button. */
  addCount: number;
  compact: boolean;
  /** The last save failed — shown under the bar. */
  error?: string | null;
}) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    // Classes on an inner View: NativeWind doesn't style `Animated.View`.
    <Animated.View entering={FadeInDown.duration(220)}>
      <View className="flex-row items-center gap-3 rounded-card border-2 border-dashed border-lime-ink/40 bg-lime-tint/60 px-4 py-3 dark:border-lime-ink-dark/40 dark:bg-lime-tint-dark/60">
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-ink dark:text-ink-dark">
            Personalizando tu inicio
          </Text>
          <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
            {compact
              ? 'Mantén presionado y arrastra · toca − para quitar'
              : 'Arrastra para mover · toca − para quitar'}
          </Text>
        </View>
        <Pressable
          onPress={onOpenAdd}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Agregar widgets (${addCount} disponibles)`}
          className={`flex-row items-center gap-1.5 rounded-full bg-ink py-2 active:opacity-80 dark:bg-lime ${
            compact ? 'px-2.5' : 'px-3.5'
          }`}
        >
          <Plus size={15} color={dark ? ICON_COLORS.ink : ICON_COLORS.lime} strokeWidth={2.5} />
          {compact ? null : (
            <Text className="text-sm font-semibold text-white dark:text-ink">Agregar</Text>
          )}
          {addCount > 0 ? (
            <View className="min-w-[18px] items-center rounded-full bg-lime px-1 dark:bg-ink">
              <Text className="text-[11px] font-bold text-ink dark:text-lime">{addCount}</Text>
            </View>
          ) : null}
        </Pressable>
        {compact ? null : (
          <Pressable
            onPress={onReset}
            hitSlop={6}
            accessibilityRole="button"
            className="flex-row items-center gap-1.5 rounded-full px-3 py-2 active:opacity-70"
          >
            <RotateCcw size={14} color={dark ? ICON_COLORS.ink2Dark : ICON_COLORS.ink2} />
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              Restablecer
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onCancel}
          hitSlop={6}
          accessibilityRole="button"
          className="rounded-full px-3 py-2 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">Cancelar</Text>
        </Pressable>
        <View style={{ width: compact ? 92 : 110 }}>
          <Button label="Listo" onPress={onDone} />
        </View>
      </View>
      {error ? (
        <View className="mt-3">
          <ErrorCard message={error} />
        </View>
      ) : null}
    </Animated.View>
  );
}

/**
 * The hidden widgets, ready to add back — a floating sheet (a dialog on
 * desktop) opened from the edit bar, so it never sits in the layout you're
 * arranging. Closes after adding one, so you see where it landed.
 */
export function AddWidgetsSheet({
  visible,
  onClose,
  available,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  available: HomeLayoutItem[];
  onAdd: (key: HomeLayoutItem) => void;
}) {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Agregar widgets">
      <View className="gap-3 px-5 pb-6">
        <Text className="text-xs text-ink-2 dark:text-ink-2-dark">
          Se colocan en el primer espacio libre de tu inicio.
        </Text>
        {available.length === 0 ? (
          <View className="items-center rounded-2xl border-2 border-dashed border-line px-4 py-6 dark:border-line-dark">
            <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
              Ya tienes todos 🙌
            </Text>
            <Text className="mt-0.5 text-center text-xs text-ink-3 dark:text-ink-3-dark">
              Quita uno con − y aparecerá aquí.
            </Text>
          </View>
        ) : (
          available.map((key) => {
            const meta = WIDGET_META[key];
            return (
              <Pressable
                key={key}
                onPress={() => {
                  onAdd(key);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${meta.label}`}
                className="flex-row items-center gap-3 rounded-2xl border border-line p-3 active:opacity-70 dark:border-line-dark"
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-lime-tint dark:bg-lime-tint-dark">
                  <meta.icon size={18} color={ICON_COLORS.limeInk} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-ink dark:text-ink-dark">
                    {meta.label}
                  </Text>
                  <Text className="text-xs text-ink-2 dark:text-ink-2-dark" numberOfLines={2}>
                    {meta.description}
                  </Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-ink dark:bg-lime">
                  <Plus
                    size={16}
                    color={dark ? ICON_COLORS.ink : ICON_COLORS.lime}
                    strokeWidth={2.5}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </BottomSheet>
  );
}
