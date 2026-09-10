import { z } from 'zod';

export const categoryTypeSchema = z.enum(['income', 'expense']);

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB hex color');

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(60),
  type: categoryTypeSchema,
  icon: z.string().trim().min(1).max(40).nullish(),
  color: hexColorSchema.nullish(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
