import { z } from 'zod';

import { hexColorSchema } from './category';

export const tagCreateSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(40),
  color: hexColorSchema.nullish(),
});

export const tagUpdateSchema = tagCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
