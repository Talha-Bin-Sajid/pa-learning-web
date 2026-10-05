import { C } from '@/lib/palette';
import type { Completion } from '@/types/api';

export type EvidenceState = 'checking' | 'verified' | 'approved' | 'flagged' | 'rejected' | 'awaiting' | 'none';

/** One word for where a submission's review stands (shared by staff and reviewer views). */
export function evidenceState(c: Completion): EvidenceState {
  if (c.reviewStatus === 'rejected') return 'rejected';
  if (c.reviewStatus === 'verified') return c.reviewSource === 'manual' ? 'approved' : 'verified';
  if (c.reviewStatus === 'flagged') return 'flagged';
  if (c.check && (c.check.status === 'queued' || c.check.status === 'running')) return 'checking';
  return c.evidence ? 'awaiting' : 'none';
}

export const EVIDENCE_STATE: Record<EvidenceState, { label: string; color: string; hint: string }> = {
  checking: { label: 'Checking', color: C.blue, hint: 'The certificate is being checked automatically.' },
  verified: { label: 'Verified', color: C.green, hint: 'Checked automatically - matches the activity.' },
  approved: { label: 'Approved', color: C.green, hint: 'Approved by the Learning Team.' },
  flagged: { label: 'Needs review', color: C.amber, hint: 'The Learning Team will review this evidence.' },
  rejected: { label: 'Rejected', color: C.red, hint: 'Upload the correct evidence to complete this item.' },
  awaiting: { label: 'Awaiting review', color: 'rgba(38,39,25,.5)', hint: 'Waiting for the Learning Team.' },
  none: { label: 'Acknowledged', color: 'rgba(38,39,25,.5)', hint: 'No file required.' },
};

/** True while any submission is still being checked (drives polling). */
export function anyChecking(list: (Completion | null | undefined)[]): boolean {
  return list.some((c) => c && evidenceState(c) === 'checking');
}
