import { z } from 'zod';

import { genderSchema } from './profile';

export const emailSchema = z.string().trim().min(1, 'Ingresa tu correo').email('Correo inválido');

/** Matches the Supabase `minimum_password_length` (8) in config.toml, plus
 * complexity rules enforced client-side for account security. */
export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Demasiado larga')
  .regex(/[a-z]/, 'Agrega una minúscula')
  .regex(/[A-Z]/, 'Agrega una mayúscula')
  .regex(/[0-9]/, 'Agrega un número')
  .regex(/[^A-Za-z0-9]/, 'Agrega un carácter especial');

/** `YYYY-MM-DD`, matching the `date` column it lands in — not before 120
 * years ago (nobody signing up is that old) or after today. */
export const birthDateSchema = z
  .string()
  .min(1, 'Ingresa tu fecha de nacimiento')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .refine((iso) => {
    const date = new Date(iso);
    const now = new Date();
    const minYear = now.getFullYear() - 120;
    return date.getFullYear() >= minYear && date <= now;
  }, 'Fecha inválida');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Ingresa tu nombre'),
  birthDate: birthDateSchema,
  // The sign-up form starts with no gender picked (`null`); narrow that away
  // here so `SignUpInput`'s `gender` is a plain `Gender`, not `Gender | null`.
  gender: genderSchema
    .nullable()
    .refine((v): v is NonNullable<typeof v> => v !== null, { message: 'Elige una opción' }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
