import { z } from 'zod';

import { currencyCodeSchema } from './account';

const name = z.string().trim().min(1, 'Ponle un nombre').max(60);
const icon = z.string().trim().min(1, 'Elige un ícono');
const targetAmount = z.number().positive('El monto debe ser mayor a 0').finite();
const deadline = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullish();
const contributionAmount = z.number().positive('Debe ser mayor a 0').finite().nullish();
const contributionIntervalDays = z.number().int().positive('Debe ser mayor a 0').nullish();

const commonFields = {
  name,
  icon,
  target_amount: targetAmount,
  // Locked after creation — see `goalUpdateSchema`, which omits it.
  currency: currencyCodeSchema,
  deadline,
  contribution_amount: contributionAmount,
  contribution_interval_days: contributionIntervalDays,
};

/** Either both the pace fields are set, or neither is — mirrors `goals_contribution_pace_shape`. */
function hasConsistentPace(v: { contribution_amount?: number | null; contribution_interval_days?: number | null }) {
  return (v.contribution_amount == null) === (v.contribution_interval_days == null);
}

export const goalCreateSchema = z.object(commonFields).refine(hasConsistentPace, {
  message: 'Define el monto y cada cuántos días, o ninguno de los dos',
  path: ['contribution_amount'],
});

export const goalUpdateSchema = z
  .object({
    name: name.optional(),
    icon: icon.optional(),
    target_amount: targetAmount.optional(),
    deadline,
    contribution_amount: contributionAmount,
    contribution_interval_days: contributionIntervalDays,
    archived: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.contribution_amount === undefined && v.contribution_interval_days === undefined
        ? true
        : hasConsistentPace(v),
    { message: 'Define el monto y cada cuántos días, o ninguno de los dos', path: ['contribution_amount'] },
  );

export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
