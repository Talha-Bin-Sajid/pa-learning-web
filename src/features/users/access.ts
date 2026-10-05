import type { Lookups, ReportingAccess, UserRole } from '@/types/api';

/** Mirrors the backend default (business rule 4) so the UI previews what saving will do. */
export function defaultAccess(role: UserRole, designationId: number | null, lookups: Lookups | undefined): ReportingAccess {
  const grants = lookups?.designations.find((d) => d.id === designationId)?.grantsFullAccess ?? false;
  return role === 'learning_team' || role === 'hr' || grants ? 'full' : 'self';
}

export interface PersonDraft {
  role?: UserRole;
  designationId?: number | null;
  lineManagerId?: string | null;
  /** Only present when the admin picked access explicitly. */
  reportingAccess?: ReportingAccess;
}
