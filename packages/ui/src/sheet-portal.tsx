import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { View } from 'react-native';

type Register = (id: string, node: ReactNode | null) => void;

const SheetPortalContext = createContext<Register | null>(null);

/**
 * How many sheets are open below this one (0 = the first). Sheets stacked on
 * top of another (a picker opened from the filters) read it to look raised
 * above it — a lighter surface in dark mode, a stronger backdrop — instead of
 * blending into the sheet behind.
 */
const SheetLevelContext = createContext(0);

export function useSheetLevel(): number {
  return useContext(SheetLevelContext);
}

const SheetCountContext = createContext(0);

/** Whether this sheet is the top one (the one Escape should close). */
export function useIsTopSheet(): boolean {
  return useContext(SheetLevelContext) === useContext(SheetCountContext) - 1;
}

/**
 * Mount once, at the app root — above any tab/stack navigator. `BottomSheet`
 * portals its content here instead of using RN's `Modal`, so it renders in
 * the same view tree as the app's own tab bar. The explicit `elevation` below
 * is required on Android: the tab bar ships with a hardcoded `elevation: 8`
 * (see `expo-router`'s `BottomTabBar`), and Android stacks siblings by
 * elevation over paint order — without out-elevating it, the tab bar wins
 * regardless of where this view sits in the tree.
 */
export function SheetPortalHost({ children }: { children: ReactNode }) {
  const [sheets, setSheets] = useState<Record<string, ReactNode>>({});

  // Stable across re-renders (only uses the functional setState form) — a
  // fresh function reference here would loop `BottomSheet`'s registration
  // effect forever, since `register` is one of its dependencies.
  const register = useCallback<Register>((id, node) => {
    setSheets((prev) => {
      if (node === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: node };
    });
  }, []);

  return (
    <SheetPortalContext.Provider value={register}>
      <SheetCountContext.Provider value={Object.keys(sheets).length}>
        {children}
        {Object.entries(sheets).map(([id, node], level) => (
          <SheetLevelContext.Provider key={id} value={level}>
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                elevation: 9999,
              }}
            >
              {node}
            </View>
          </SheetLevelContext.Provider>
        ))}
      </SheetCountContext.Provider>
    </SheetPortalContext.Provider>
  );
}

export function useSheetPortalRegister(): Register {
  const register = useContext(SheetPortalContext);
  if (!register) {
    throw new Error(
      'BottomSheet must be rendered under a <SheetPortalHost> (mounted in the root layout).',
    );
  }
  return register;
}
