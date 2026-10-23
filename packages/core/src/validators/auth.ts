import { z } from 'zod';

import { genderSchema } from './profile';

// Messages are translation keys (`validation` namespace) — shown with `translateMessage`.

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'validation:emailRequired')
  .email('validation:emailInvalid');

/** Matches the Supabase `minimum_password_length` (8) in config.toml, plus
 * complexity rules enforced client-side for account security. */
export const passwordSchema = z
  .string()
  .min(8, 'validation:passwordMin')
  .max(72, 'validation:passwordMax')
  .regex(/[a-z]/, 'validation:passwordLower')
  .regex(/[A-Z]/, 'validation:passwordUpper')
  .regex(/[0-9]/, 'validation:passwordNumber')
  .regex(/[^A-Za-z0-9]/, 'validation:passwordSpecial');

/** `YYYY-MM-DD`, matching the `date` column it lands in — not before 120
 * years ago (nobody signing up is that old) or after today. */
export const birthDateSchema = z
  .string()
  .min(1, 'validation:birthDateRequired')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation:dateInvalid')
  .refine((iso) => {
    const date = new Date(iso);
    const now = new Date();
    const minYear = now.getFullYear() - 120;
    return date.getFullYear() >= minYear && date <= now;
  }, 'validation:dateInvalid');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'validation:passwordRequired'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'validation:nameRequired'),
  // Birth date and gender aren't asked at sign-up: they're optional, filled
  // in from the profile if the person wants (see the Aviso de privacidad).
  /** The sign-up form's checkbox: Términos y condiciones + Aviso de privacidad (+ age). */
  acceptsLegal: z.boolean().refine((v) => v, 'validation:acceptLegal'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Step 1 of "olvidé mi contraseña": where to send the code. */
export const passwordResetRequestSchema = z.object({ email: emailSchema });

/** Step 2: the emailed code plus the new password (same rules as sign-up), typed twice. */
export const passwordResetSchema = z
  .object({
    email: emailSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6,10}$/, 'validation:resetCode'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation:passwordsDontMatch',
  });

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
