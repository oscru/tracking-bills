import { IconButton } from './icon-button';

export interface BackButtonProps {
  onPress: () => void;
}

/** A round icon-only back control for the top of a page — no breadcrumb label. */
export function BackButton({ onPress }: BackButtonProps) {
  return <IconButton icon="chevron-back" onPress={onPress} accessibilityLabel="Volver" />;
}
