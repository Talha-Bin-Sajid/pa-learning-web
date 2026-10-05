import { formatDate, formatHours } from '@/lib/format';
import { C } from '@/lib/palette';
import type { EvidenceTarget } from '@/components/shared/EvidenceViewer';
import type { PlanEntry } from '@/types/api';

/** How a plan entry is presented (status word, colours, due line) - shared by My Plan and Team Progress. */
export function entryVisuals(e: PlanEntry) {
  const done = e.status === 'completed';
  const overdue = e.status === 'overdue';
  /** Counts as done, but the evidence is still being checked / reviewed. */
  const underReview = done && !e.confirmed;
  return {
    underReview,
    status: underReview ? 'Submitted' : done ? 'Completed' : overdue ? 'Overdue' : e.item.isMandatory ? 'Mandatory' : 'Not started',
    statusColor: underReview ? C.teal : done ? C.green : overdue ? C.red : e.item.isMandatory ? C.purple : 'rgba(38,39,25,.5)',
    accent: underReview ? C.teal : done ? C.green : overdue ? C.red : e.item.isMandatory ? C.purple : C.blue,
    dot: underReview ? C.teal : done ? C.green : overdue ? C.red : e.item.isMandatory ? C.blue : 'rgba(0,0,0,.2)',
    due:
      done && e.completion
        ? `Completed ${formatDate(e.completion.completedOn)}`
        : e.item.dueDate
          ? `Due ${formatDate(e.item.dueDate)}`
          : 'No due date',
    dueColor: overdue ? C.red : 'rgba(38,39,25,.6)',
    meta: `${formatHours(e.item.hours)} · ${done && e.completion ? `completed ${formatDate(e.completion.completedOn)}` : `due ${formatDate(e.item.dueDate)}`}${e.item.isMandatory ? ' · mandatory' : ''}${underReview ? ' · evidence under review' : ''}`,
  };
}

/** Evidence viewer target for a completed plan entry. */
export function evidenceTarget(e: PlanEntry, extraMeta?: string): EvidenceTarget | null {
  if (!e.completion) return null;
  return {
    completionId: e.completion.id,
    title: e.item.title,
    meta: [formatDate(e.completion.completedOn), extraMeta].filter(Boolean).join(' · '),
    reflection: e.completion.reflection,
    hasFile: !!e.completion.evidence,
  };
}
