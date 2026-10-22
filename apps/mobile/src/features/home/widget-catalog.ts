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

/**
 * Name, one-line description and icon of each of Home's optional widgets —
 * shared by Home's edit mode and Opciones › Orden del inicio.
 */
export const WIDGET_META: Record<
  HomeLayoutItem,
  { label: string; description: string; icon: LucideIcon }
> = {
  pending: {
    label: 'Movimientos pendientes',
    description: 'Gastos o ingresos que ya deberían haberse realizado',
    icon: Clock,
  },
  upcoming: {
    label: 'Movimientos próximos',
    description: 'Recordatorio de lo que tienes programado a futuro',
    icon: Calendar,
  },
  budgets: {
    label: 'Presupuestos',
    description: 'Qué tan cerca estás del límite de tus categorías',
    icon: Gauge,
  },
  categorySpend: {
    label: 'Gastos por categoría',
    description: 'Gráfica y tus 5 categorías con más gasto',
    icon: ChartPie,
  },
  weeklySpend: {
    label: 'Gastos semanales',
    description: 'Vistazo rápido de lo gastado esta semana, día por día',
    icon: ChartColumn,
  },
  monthlyTrend: {
    label: 'Tendencia mensual',
    description: 'Ingresos vs. gastos de los últimos 6 meses',
    icon: TrendingUp,
  },
  accounts: {
    label: 'Tus cuentas',
    description: 'Lista de cuentas y su saldo',
    icon: Wallet,
  },
};
