import { z } from 'zod';

import { HOME_LAYOUT_ITEMS } from '../home-layout';

export const homeLayoutItemSchema = z.enum(HOME_LAYOUT_ITEMS);

export const profileUpdateSchema = z.object({
  /** Custom order of the Home screen's optional cards — see `HOME_LAYOUT_ITEMS`. */
  home_layout: z.array(homeLayoutItemSchema).optional(),
  /** Which of those cards are switched off entirely. */
  home_hidden_items: z.array(homeLayoutItemSchema).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
