import type { HomeLayoutItem } from '@repo/core/utils';
import {
  Calendar,
  ChartColumn,
  ChartPie,
  Clock,
  Gauge,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const WIDGET_ICONS: Record<HomeLayoutItem, LucideIcon> = {
  pending: Clock,
  upcoming: Calendar,
  budgets: Gauge,
  categorySpend: ChartPie,
  weeklySpend: ChartColumn,
  monthlyTrend: TrendingUp,
  accounts: Wallet,
};

export type WidgetMeta = { label: string; description: string; icon: LucideIcon };

/**
 * Name, one-line description (`home:widgets`) and icon of each of Home's
 * optional widgets — shared by Home's edit mode and Opciones › Personalizar
 * inicio.
 */
export function useWidgetMeta(): (key: HomeLayoutItem) => WidgetMeta {
  const { t } = useTranslation('home');
  return useCallback(
    (key) => ({
      label: t(`widgets.${key}.label`),
      description: t(`widgets.${key}.description`),
      icon: WIDGET_ICONS[key],
    }),
    [t],
  );
}
