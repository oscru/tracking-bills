import { z } from 'zod';

import { HOME_LAYOUT_ITEMS } from '../home-layout';
import { currencyCodeSchema } from './account';

export const homeLayoutItemSchema = z.enum(HOME_LAYOUT_ITEMS);

export const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

export const genderSchema = z.enum(['female', 'male', 'other', 'prefer_not_to_say']);

const fullName = z.string().trim().min(1, 'Ingresa tu nombre').max(120);

/** `YYYY-MM-DD` — not before 120 years ago (nobody using this app is that
 * old) or after today. Mirrors `birthDateSchema` in `validators/auth.ts`
 * (not imported from there to avoid a circular import — `auth.ts` already
 * imports `genderSchema` from this file). */
const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .refine((iso) => {
    const date = new Date(iso);
    const now = new Date();
    const minYear = now.getFullYear() - 120;
    return date.getFullYear() >= minYear && date <= now;
  }, 'Fecha inválida');

export const profileUpdateSchema = z.object({
  /** Null only for an OAuth sign-in that's never completed this — see
   * `Gender`'s doc comment. Editing always sets a real value, never clears
   * one back to null (there's no UI path that would want to). */
  full_name: fullName.optional(),
  birth_date: birthDate.optional(),
  gender: genderSchema.optional(),
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
  /** Auto-shows the welcome carousel once while false. */
  has_seen_tour: z.boolean().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
