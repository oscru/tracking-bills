import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';

export interface ScreenProps {
  children: ReactNode;
  /** Extra classes on the inner padded container. */
  className?: string;
  edges?: Edges;
  /** Center children on the cross axis (handy for auth screens). */
  center?: boolean;
  /** Wrap children in a keyboard-aware ScrollView (forms — not list screens). */
  scroll?: boolean;
}

export function Screen({
  children,
  className = '',
  edges = ['top', 'bottom'],
  center = false,
  scroll = false,
}: ScreenProps) {
  // On wide web the content column is capped and centered.
  const web = Platform.OS === 'web' ? 'mx-auto w-full max-w-[480px]' : '';

  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`grow px-5 ${web} ${center ? 'justify-center' : ''} ${className}`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 px-5 ${web} ${center ? 'justify-center' : ''} ${className}`}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-canvas dark:bg-canvas-dark"
    >
      <SafeAreaView edges={edges} className="flex-1">
        {content}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
