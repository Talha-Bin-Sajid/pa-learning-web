import { memo } from 'react';
import { EVIDENCE_STATE, evidenceState } from '@/components/shared/evidence-status';
import { Button, buttonClasses } from '@/components/ui/Button';
import { StatusText } from '@/components/ui/bits';
import { formatHours } from '@/lib/format';
import type { PlanEntry } from '@/types/api';
import { entryVisuals } from './plan-visuals';

interface PlanCardProps {
  entry: PlanEntry;
  onUpload: (entry: PlanEntry) => void;
  onView: (entry: PlanEntry) => void;
}

/** Review state of the submitted evidence, with the reason when it needs attention. */
function ReviewLine({ completion }: { completion: NonNullable<PlanEntry['completion']> }) {
  const state = evidenceState(completion);
  const look = EVIDENCE_STATE[state];
  const label = state === 'checking' ? 'Checking evidence…' : state === 'flagged' ? 'Under review' : look.label;
  const detail =
    state === 'flagged'
      ? `${completion.reviewNotes ? `${completion.reviewNotes} ` : ''}It still counts - the Learning Team will check it.`
      : look.hint;
  return (
    <div className="mt-2.5 flex items-start gap-2 text-[12px] leading-5">
      <span aria-hidden className={`mt-[6px] size-2 shrink-0 rounded-full ${state === 'checking' ? 'animate-pulse' : ''}`} style={{ background: look.color }} />
      <span>
        <span className="font-semibold" style={{ color: look.color }}>
          {label}
        </span>
        <span className="text-[rgba(38,39,25,.6)]"> - {detail}</span>
      </span>
    </div>
  );
}

/** One learning item in My Plan: status, meta, description, reflection and actions. */
export const PlanCard = memo(function PlanCard({ entry, onUpload, onView }: PlanCardProps) {
  const v = entryVisuals(entry);
  const { item, completion } = entry;
  const done = entry.status === 'completed';
  return (
    <article className="mb-3 bg-white px-5 py-5 shadow-card sm:px-6" style={{ borderLeft: `3px solid ${v.accent}` }}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
        <StatusText color={v.statusColor}>{v.status}</StatusText>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] text-[rgba(38,39,25,.6)]">
        <span>{item.deliveryType.name}</span>
        <span>{formatHours(item.hours).replace(' h', ' hours')}</span>
        <span>{item.provider}</span>
        <span style={{ color: v.dueColor }}>{v.due}</span>
      </div>
      {item.description ? <p className="mt-2.5 max-w-[720px] text-[13px] leading-[22px] text-[rgba(38,39,25,.75)]">{item.description}</p> : null}
      {done && completion?.evidence ? <ReviewLine completion={completion} /> : null}
      {entry.rejected ? (
        <div role="status" className="mt-2.5 border-l-2 border-pa-red bg-[#fdf0ee] px-3.5 py-2.5 text-[12px] leading-5 text-body">
          <span className="font-semibold text-pa-red">Evidence rejected. </span>
          {entry.rejected.reviewNotes} Upload the correct certificate to complete this item.
        </div>
      ) : null}
      {done && completion?.reflection ? (
        <div className="mt-2.5 bg-panel px-3.5 py-2.5 text-[12px] leading-5 text-[rgba(38,39,25,.6)]">{completion.reflection}</div>
      ) : null}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {item.link ? (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className={buttonClasses('outline', 'md', false, 'text-body hover:text-body')}>
            Open learning
          </a>
        ) : null}
        <Button variant={done ? 'outline' : 'success'} onClick={() => onUpload(entry)}>
          {item.evidenceMode === 'acknowledgement' && !done ? 'Confirm complete' : done ? 'Replace evidence' : 'Upload evidence'}
        </Button>
        {done ? (
          <Button onClick={() => onView(entry)}>{completion?.evidence ? 'View evidence' : 'View record'}</Button>
        ) : null}
      </div>
    </article>
  );
});
