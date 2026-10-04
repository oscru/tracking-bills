/**
 * @repo/ui — shared NativeWind components used across web and native.
 * Design system: "Lima + tinta" (ink-primary + lime accent). Tokens live in
 * @repo/config/tailwind/preset.
 */
export { AmountDisplay, type AmountDisplayProps } from './amount-display';
export { Avatar, type AvatarProps } from './avatar';
export { BackButton, type BackButtonProps } from './back-button';
export { BottomSheet, type BottomSheetProps } from './bottom-sheet';
export { Button, type ButtonProps } from './button';
export { CategoryDot, type CategoryDotProps } from './category-dot';
export { Chip, type ChipProps } from './chip';
export { ColorPicker, type ColorPickerProps } from './color-picker';
export { ConfirmSheet, type ConfirmSheetProps } from './confirm-sheet';
export { EmptyState, type EmptyStateProps } from './empty-state';
export {
  TagsEmptyIllustration,
  AccountsEmptyIllustration,
  BudgetsEmptyIllustration,
  GoalsEmptyIllustration,
  CategoriesEmptyIllustration,
  TransactionsEmptyIllustration,
  type EmptyIllustrationProps,
} from './empty-state-illustrations';
export { ErrorCard, type ErrorCardProps } from './error-card';
export { Fab, type FabProps } from './fab';
export { IconButton, type IconButtonProps } from './icon-button';
export { ListRow, type ListRowProps } from './list-row';
export { NumericKeypad, type NumericKeypadProps, type KeypadKey } from './numeric-keypad';
export { PageHeader, type PageHeaderProps } from './page-header';
export { Screen, type ScreenProps } from './screen';
export { Skeleton, type SkeletonProps } from './skeleton';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './segmented-control';
export { SheetPortalHost } from './sheet-portal';
export { SwitchRow, type SwitchRowProps } from './switch-row';
export { TextField, type TextFieldProps } from './text-field';
export { CurrencyField, type CurrencyFieldProps } from './currency-field';
export { ICON_COLORS } from './icon-colors';
