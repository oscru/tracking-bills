import { z } from 'zod';

import { HOME_LAYOUT_ITEMS } from '../home-layout';
import { currencyCodeSchema } from './account';

export const homeLayoutItemSchema = z.enum(HOME_LAYOUT_ITEMS);

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

export const profileUpdateSchema = z.object({
  /** Custom order of the Home screen's optional cards — see `HOME_LAYOUT_ITEMS`. */
  home_layout: z.array(homeLayoutItemSchema).optional(),
  /** Which of those cards are switched off entirely. */
  home_hidden_items: z.array(homeLayoutItemSchema).optional(),
  /** Base display currency — falls back to the first account's currency where unset. */
  currency: currencyCodeSchema.optional(),
  theme_preference: themePreferenceSchema.optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
