import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Required').email('Enter a valid email');

/** Matches the Supabase `minimum_password_length` (8) in config.toml. */
export const passwordSchema = z.string().min(8, 'At least 8 characters').max(72, 'Too long');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
