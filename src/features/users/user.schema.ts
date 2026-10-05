import { z } from 'zod';
import { LIMITS, rules } from '@/lib/forms';
import type { PersonAdmin } from '@/types/api';
import type { PersonInput } from './api';

/** Add / edit person. Mirrors backend `personBody`. Selects hold strings; '' means none. */
export const userSchema = z.object({
  fullName: rules.requiredText('Enter a full name', LIMITS.nameMax),
  email: rules.email,
  role: z.enum(['learning_team', 'hr', 'manager', 'team_member']),
  designationId: z.string(),
  lineManagerId: z.string(),
  /** 'auto' = default for role/designation (decided by the server). */
  access: z.enum(['auto', 'full', 'self']),
  status: z.enum(['active', 'pending', 'inactive']),
});

export type UserFormValues = z.infer<typeof userSchema>;

export function userDefaults(person: PersonAdmin | null): UserFormValues {
  return {
    fullName: person?.fullName ?? '',
    email: person?.email ?? '',
    role: person?.role ?? 'team_member',
    designationId: person?.designation ? String(person.designation.id) : '',
    lineManagerId: person?.lineManager?.id ?? '',
    access: person ? person.reportingAccess : 'auto',
    status: person?.status ?? 'active',
  };
}

export function toPersonInput(v: UserFormValues, isEdit: boolean): PersonInput {
  return {
    fullName: v.fullName,
    email: v.email,
    role: v.role,
    designationId: v.designationId ? Number(v.designationId) : null,
    lineManagerId: v.lineManagerId || null,
    ...(v.access === 'auto' ? {} : { reportingAccess: v.access }),
    ...(isEdit ? { status: v.status } : {}),
  };
}
