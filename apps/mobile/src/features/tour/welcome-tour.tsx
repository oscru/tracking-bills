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

import { WELCOME_SLIDES_CONTENT, type WelcomeSlideIllustrationKey } from './tour-content';
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

const SLIDES = WELCOME_SLIDES_CONTENT.map((slide) => ({
  illustration: ILLUSTRATIONS[slide.illustrationKey],
  title: slide.title,
  description: slide.description,
}));

/** Mounted once, above every authenticated screen (`(app)/_layout.tsx`) —
 * shows itself automatically once per account (`profiles.has_seen_tour`)
 * and reappears whenever Settings' "Ver tour de nuevo" resets that flag. */
export function WelcomeTour() {
  const { visible, onDone } = useWelcomeCarousel();
  return <WelcomeCarousel visible={visible} slides={SLIDES} onDone={onDone} />;
}
