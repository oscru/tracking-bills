import { Text, View } from 'react-native';

/** A person's initial in a circle — lime while linked, gray once unlinked. */
export function PersonAvatar({
  name,
  muted = false,
  size = 44,
}: {
  name: string;
  muted?: boolean;
  size?: number;
}) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={`items-center justify-center ${muted ? 'bg-line dark:bg-line-dark' : 'bg-lime'}`}
    >
      <Text
        style={{ fontSize: size * 0.4 }}
        className={`font-bold ${muted ? 'text-ink-2 dark:text-ink-2-dark' : 'text-ink'}`}
      >
        {name.trim()[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

/** What a contact account's net means, in words: who has sent the other more. */
export function netLabel(net: number): string {
  if (Math.round(net * 100) === 0) return 'Están parejos';
  return net > 0 ? 'Le has enviado más' : 'Te ha enviado más';
}
