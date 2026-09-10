import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';

export interface ScreenProps {
  children: ReactNode;
  /** Extra classes on the inner padded container. */
  className?: string;
  edges?: Edges;
  /** Center children on the cross axis (handy for auth screens). */
  center?: boolean;
}

export function Screen({
  children,
  className = '',
  edges = ['top', 'bottom'],
  center = false,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-white dark:bg-neutral-950">
      <View className={`flex-1 px-5 ${center ? 'justify-center' : ''} ${className}`}>
        {children}
      </View>
    </SafeAreaView>
  );
}
