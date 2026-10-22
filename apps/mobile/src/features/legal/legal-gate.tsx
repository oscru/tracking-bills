import { useProfile, useSignOut, useUpdateProfile } from '@repo/core/hooks';
import { LEGAL_VERSION, toFriendlyMessage } from '@repo/core/utils';
import { Button, ErrorCard, ICON_COLORS } from '@repo/ui';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LEGAL_LABELS, LegalConsent, openLegal } from './legal';

/**
 * Asks to accept the legal documents before using the app when the profile
 * hasn't accepted the current `LEGAL_VERSION`: accounts created with
 * Google/Apple (they never see the sign-up form's checkbox), accounts from
 * before the documents existed, and everyone after a new version. Covers
 * the whole app until accepted; not accepting means signing out.
 */
export function LegalGate() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const signOut = useSignOut();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!profile || profile.legal_version === LEGAL_VERSION) return null;
  // The column doesn't exist yet (app deployed before its migration): asking
  // would lock everyone out, since accepting couldn't be saved. Skip it.
  if (!('legal_version' in profile)) return null;
  const isUpdate = profile.legal_version != null;

  const accept = () => {
    if (!checked) {
      setError('Marca la casilla para continuar');
      return;
    }
    setError(undefined);
    update.mutate(
      { legal_version: LEGAL_VERSION, legal_accepted_at: new Date().toISOString() },
      { onError: (e) => setError(toFriendlyMessage(e, 'No se pudo guardar. Intenta de nuevo.')) },
    );
  };

  return (
    <View
      className="absolute inset-0 bg-canvas dark:bg-canvas-dark"
      style={{ zIndex: 1000, elevation: 1000 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerClassName="grow justify-center px-5 py-8"
          contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}
        >
          <View className="gap-6">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-lime-tint dark:bg-lime-tint-dark">
              <ShieldCheck size={28} color={ICON_COLORS.limeInk} />
            </View>
            <View className="gap-2">
              <Text className="text-[28px] font-bold tracking-tight text-ink dark:text-ink-dark">
                {isUpdate ? 'Actualizamos nuestros documentos' : 'Antes de continuar'}
              </Text>
              <Text className="text-base leading-6 text-ink-2 dark:text-ink-2-dark">
                {isUpdate
                  ? 'Cambiamos nuestros términos o nuestro aviso de privacidad. Revísalos y acéptalos para seguir usando Genobills.'
                  : 'Para usar Genobills necesitamos que aceptes nuestros términos y nuestro aviso de privacidad. En resumen: solo guardamos lo necesario para que la app funcione, no vendemos tus datos y no mostramos anuncios.'}
              </Text>
            </View>

            <View className="overflow-hidden rounded-2xl border border-line dark:border-line-dark">
              {(['terms', 'privacy', 'cookies'] as const).map((doc, i) => (
                <Pressable
                  key={doc}
                  onPress={() => openLegal(doc)}
                  accessibilityRole="link"
                  className={`flex-row items-center justify-between bg-surface px-4 py-3.5 active:opacity-70 dark:bg-surface-dark ${
                    i > 0 ? 'border-t border-line dark:border-line-dark' : ''
                  }`}
                >
                  <Text className="text-[15px] font-medium text-ink dark:text-ink-dark">
                    {LEGAL_LABELS[doc]}
                  </Text>
                  <Text className="text-sm font-semibold text-lime-ink dark:text-lime-ink-dark">
                    Leer ›
                  </Text>
                </Pressable>
              ))}
            </View>

            <LegalConsent
              checked={checked}
              onChange={(v) => {
                setChecked(v);
                if (v) setError(undefined);
              }}
            />

            <ErrorCard message={error} />

            <View className="gap-3">
              <Button label="Aceptar y continuar" onPress={accept} loading={update.isPending} />
              <Pressable
                onPress={() => signOut.mutate()}
                hitSlop={8}
                accessibilityRole="button"
                className="items-center py-2"
              >
                <Text className="text-sm font-semibold text-ink-2 dark:text-ink-2-dark">
                  No acepto, cerrar sesión
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
