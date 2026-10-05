import { z } from 'zod';

/** New learning year. Mirrors backend `createCycleBody`; also rejects years that already exist. */
export function newYearSchema(existingYears: number[]) {
  return z.object({
    // One check at a time so the user sees the most relevant message (zod 4 keeps refining after a failure).
    year: z
      .string()
      .trim()
      .superRefine((v, ctx) => {
        const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
        if (!/^\d{4}$/.test(v)) return fail('Enter a four-digit year');
        const year = Number(v);
        if (year < 2000 || year > 2100) return fail('Choose a year between 2000 and 2100');
        if (existingYears.includes(year)) return fail('That year already exists');
      }),
    copyFrom: z.string(),
    makeCurrent: z.enum(['yes', 'no']),
  });
}

export type NewYearValues = z.infer<ReturnType<typeof newYearSchema>>;
