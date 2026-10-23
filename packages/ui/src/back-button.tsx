import { ChevronLeft } from 'lucide-react-native';

import { IconButton } from './icon-button';
import { useTranslation } from 'react-i18next';

export interface BackButtonProps {
  onPress: () => void;
}

/** A round icon-only back control for the top of a page — no breadcrumb label. */
export function BackButton({ onPress }: BackButtonProps) {
  const { t } = useTranslation('common');
  return <IconButton icon={ChevronLeft} onPress={onPress} accessibilityLabel={t('back')} />;
}
