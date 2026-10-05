import { z } from 'zod';
import { LIMITS, rules } from '@/lib/forms';

/** Sign in and Request access share one form; `mode` decides which rules apply. */
export const authSchema = z
  .object({
    mode: z.enum(['in', 'up']),
    fullName: z.string().trim().max(LIMITS.nameMax, `At most ${LIMITS.nameMax} characters`),
    email: rules.email,
    password: z.string().min(1, 'Enter your password').max(128),
  })
  .superRefine((v, ctx) => {
    if (v.mode !== 'up') return;
    if (!v.fullName) ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Enter your full name' });
    if (v.password.length < LIMITS.passwordMin) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: `Use at least ${LIMITS.passwordMin} characters` });
    }
  });

export type AuthValues = z.infer<typeof authSchema>;
