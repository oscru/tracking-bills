import {
  AccountsEmptyIllustration,
  BudgetsEmptyIllustration,
  CategoriesEmptyIllustration,
  GoalsEmptyIllustration,
  TagsEmptyIllustration,
  TransactionsEmptyIllustration,
  WelcomeCarousel,
} from '@repo/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { WELCOME_SLIDES, type WelcomeSlideIllustrationKey } from './tour-content';
import { useWelcomeCarousel } from './use-tour';

const ILLUSTRATION_SIZE = 160;

const ILLUSTRATIONS: Record<WelcomeSlideIllustrationKey, ReactNode> = {
  accounts: <AccountsEmptyIllustration size={ILLUSTRATION_SIZE} />,
  transactions: <TransactionsEmptyIllustration size={ILLUSTRATION_SIZE} />,
  categories: <CategoriesEmptyIllustration size={ILLUSTRATION_SIZE} />,
  budgets: <BudgetsEmptyIllustration size={ILLUSTRATION_SIZE} />,
  goals: <GoalsEmptyIllustration size={ILLUSTRATION_SIZE} />,
  tags: <TagsEmptyIllustration size={ILLUSTRATION_SIZE} />,
};

/** Mounted once, above every authenticated screen (`(app)/_layout.tsx`) —
 * shows itself automatically once per account (`profiles.has_seen_tour`)
 * and reappears whenever Settings' "Ver tour de nuevo" resets that flag. */
export function WelcomeTour() {
  const { t } = useTranslation('tour');
  const { visible, onDone } = useWelcomeCarousel();
  const slides = WELCOME_SLIDES.map((key) => ({
    illustration: ILLUSTRATIONS[key],
    title: t(`slides.${key}.title`),
    description: t(`slides.${key}.description`),
  }));
  return <WelcomeCarousel visible={visible} slides={slides} onDone={onDone} />;
}
