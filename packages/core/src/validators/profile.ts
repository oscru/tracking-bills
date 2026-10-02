import { z } from 'zod';

import { HOME_LAYOUT_ITEMS } from '../home-layout';
import { currencyCodeSchema } from './account';

export const homeLayoutItemSchema = z.enum(HOME_LAYOUT_ITEMS);

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

export const genderSchema = z.enum(['female', 'male', 'other', 'prefer_not_to_say']);

export const profileUpdateSchema = z.object({
  /** Custom order of the Home screen's optional cards — see `HOME_LAYOUT_ITEMS`. */
  home_layout: z.array(homeLayoutItemSchema).optional(),
  /** Which of those cards are switched off entirely. */
  home_hidden_items: z.array(homeLayoutItemSchema).optional(),
  /** Preselected by default when creating a new account — must stay one of `enabled_currencies`. */
  currency: currencyCodeSchema.optional(),
  /** The currency "pack" offered when picking an account's currency — a user-curated subset of ISO 4217. */
  enabled_currencies: z.array(currencyCodeSchema).min(1, 'Elige al menos una divisa').optional(),
  theme_preference: themePreferenceSchema.optional(),
  /** Auto-tags new expenses/income/transfers with `travel_trip_tag_id` while on. */
  travel_mode: z.boolean().optional(),
  /** The tag applied by default while `travel_mode` is on. `null` clears it. */
  travel_trip_tag_id: z.string().uuid().nullable().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
