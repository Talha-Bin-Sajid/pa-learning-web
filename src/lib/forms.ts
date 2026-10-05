import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from './api-client';

/**
 * Shared form plumbing: zod rules that mirror the backend validators
 * (backend/src/interfaces/http/validators) and server-error mapping.
 */

export const LIMITS = {
  nameMax: 120,
  titleMax: 200,
  providerMax: 120,
  descriptionMax: 2000,
  reflectionMax: 2000,
  hoursMax: 500,
  passwordMin: 10,
  evidenceMaxBytes: 15 * 1024 * 1024,
} as const;

export const EVIDENCE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const rules = {
  requiredText: (message: string, max: number) => z.string().trim().min(1, message).max(max, `At most ${max} characters`),
  optionalText: (max: number) => z.string().trim().max(max, `At most ${max} characters`),
  email: z.string().trim().min(1, 'Enter an email address').regex(EMAIL, 'Enter a valid email address'),
  /** Optional http(s) URL; blank allowed. */
  link: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Link must start with http:// or https://'),
  /** YYYY-MM-DD from <input type="date">; blank allowed. */
  optionalDate: z.string().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use a valid date'),
};

/** Optional date range where "to" must not be before "from". */
export const periodSchema = z
  .object({ from: rules.optionalDate, to: rules.optionalDate })
  .refine((p) => !p.from || !p.to || p.from <= p.to, { path: ['to'], message: 'Must be on or after From' });
export type PeriodValues = z.infer<typeof periodSchema>;

/** Same as periodSchema, but both dates are required. */
export const requiredPeriodSchema = periodSchema.superRefine((p, ctx) => {
  if (!p.from) ctx.addIssue({ code: 'custom', path: ['from'], message: 'Choose a start date' });
  if (!p.to) ctx.addIssue({ code: 'custom', path: ['to'], message: 'Choose an end date' });
});

/**
 * Puts the server's field errors (ApiError.details) onto the matching form
 * fields. `aliases` maps server paths to form field names when they differ.
 * Returns true if at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  aliases: Record<string, Path<T>> = {},
): boolean {
  if (!(err instanceof ApiError)) return false;
  let applied = false;
  for (const d of err.details) {
    const name = aliases[d.path] ?? aliases[d.path.split('.')[0]!] ?? (d.path as Path<T>);
    if (fields.includes(name)) {
      setError(name, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}
