import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { View } from 'react-native';

type Register = (id: string, node: ReactNode | null) => void;

const SheetPortalContext = createContext<Register | null>(null);

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
      {children}
      {Object.entries(sheets).map(([id, node]) => (
        <View
          key={id}
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
      ))}
    </SheetPortalContext.Provider>
  );
}

export function useSheetPortalRegister(): Register {
  const register = useContext(SheetPortalContext);
  if (!register) {
    throw new Error('BottomSheet must be rendered under a <SheetPortalHost> (mounted in the root layout).');
  }
  return register;
}
