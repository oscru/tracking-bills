import { z } from 'zod';

import { genderSchema } from './profile';

export const emailSchema = z.string().trim().min(1, 'Required').email('Enter a valid email');

/** Matches the Supabase `minimum_password_length` (8) in config.toml, plus
 * complexity rules enforced client-side for account security. */
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'Too long')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number')
  .regex(/[^A-Za-z0-9]/, 'Add a special character');

/** `YYYY-MM-DD`, matching the `date` column it lands in — not before 120
 * years ago (nobody signing up is that old) or after today. */
export const birthDateSchema = z
  .string()
  .min(1, 'Required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
  .refine((iso) => {
    const date = new Date(iso);
    const now = new Date();
    const minYear = now.getFullYear() - 120;
    return date.getFullYear() >= minYear && date <= now;
  }, 'Enter a valid date');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Required'),
  birthDate: birthDateSchema,
  // The sign-up form starts with no gender picked (`null`); narrow that away
  // here so `SignUpInput`'s `gender` is a plain `Gender`, not `Gender | null`.
  gender: genderSchema
    .nullable()
    .refine((v): v is NonNullable<typeof v> => v !== null, { message: 'Required' }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
