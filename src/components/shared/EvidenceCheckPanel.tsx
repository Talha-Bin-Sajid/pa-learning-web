import { CircularProgress } from '@mui/material';
import { cn } from '@/lib/cn';
import { formatDate, formatHours } from '@/lib/format';
import { C } from '@/lib/palette';
import type { CheckResult, Completion, LearningItem } from '@/types/api';
import { EVIDENCE_STATE, evidenceState } from './evidence-status';

interface EvidenceCheckPanelProps {
  completion: Completion;
  item: LearningItem;
  personName: string;
  /** Reviewer view shows the full comparison; staff see the outcome and reasons. */
  detailed?: boolean;
}

const RESULT: Record<CheckResult | 'ok' | 'bad' | 'na', { mark: string; color: string; label: string }> = {
  match: { mark: '✓', color: C.green, label: 'Matches' },
  ok: { mark: '✓', color: C.green, label: 'OK' },
  partial: { mark: '~', color: C.amber, label: 'Partly matches' },
  mismatch: { mark: '✗', color: C.red, label: 'Does not match' },
  bad: { mark: '✗', color: C.red, label: 'Problem' },
  not_found: { mark: '?', color: 'rgba(38,39,25,.45)', label: 'Not shown' },
  na: { mark: '-', color: 'rgba(38,39,25,.35)', label: 'Not shown' },
};

/**
 * Outcome of the automatic evidence check: status, reasons and (for reviewers)
 * what was expected vs what the certificate shows.
 */
export function EvidenceCheckPanel({ completion: c, item, personName, detailed = false }: EvidenceCheckPanelProps) {
  const state = evidenceState(c);
  const look = EVIDENCE_STATE[state];
  const check = c.check;
  const x = check?.extracted;
  const reasons = c.reviewStatus === 'flagged' || c.reviewStatus === 'rejected' ? c.reviewNotes : null;

  const dateResult = !x?.completionDate ? 'na' : check?.reasons.some((r) => r.includes(x.completionDate!)) ? 'bad' : 'ok';
  const hoursResult = x?.hours == null ? 'na' : x.hours + 1e-9 < item.hours ? 'bad' : 'ok';
  const rows: { label: string; expected: string; found: string | null; result: keyof typeof RESULT }[] = check?.checks
    ? [
        { label: 'Name', expected: personName, found: x?.participantName ?? null, result: check.checks.name },
        { label: 'Course', expected: item.title, found: x?.courseTitle ?? null, result: check.checks.title },
        { label: 'Provider', expected: item.provider, found: x?.provider ?? null, result: check.checks.provider },
        { label: 'Date', expected: formatDate(c.completedOn), found: x?.completionDate ? formatDate(x.completionDate) : null, result: dateResult },
        { label: 'Hours', expected: `${formatHours(item.hours)} required`, found: x?.hours != null ? formatHours(x.hours) : null, result: hoursResult },
      ]
    : [];

  return (
    <section aria-label="Evidence check" className="border border-[rgba(0,0,0,.08)] bg-white" style={{ borderLeft: `3px solid ${look.color}` }}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {state === 'checking' ? <CircularProgress size={14} thickness={5} /> : <span aria-hidden className="size-2.5 rounded-full" style={{ background: look.color }} />}
          <span className="text-[12px] font-semibold uppercase tracking-[1.1px]" style={{ color: look.color }}>
            {look.label}
          </span>
          {c.reviewSource ? (
            <span className="text-[11px] text-faint">· {c.reviewSource === 'ai' ? 'automatic check' : 'Learning Team'}</span>
          ) : null}
        </div>
        {detailed && check?.confidence != null && check.status === 'done' ? (
          <span className="text-[11px] text-subtle">
            Confidence <strong className="font-semibold text-body">{Math.round(check.confidence * 100)}%</strong>
          </span>
        ) : null}
      </div>

      <div className="border-t border-[rgba(0,0,0,.06)] px-4 py-3 text-[13px] leading-[21px] text-body">
        {state === 'checking' ? <p className="text-subtle">Reading the certificate and comparing it with this activity - usually under a minute.</p> : null}
        {reasons ? <p className={cn(c.reviewStatus === 'rejected' && 'text-pa-red')}>{reasons}</p> : null}
        {!reasons && state !== 'checking' ? <p className="text-subtle">{look.hint}</p> : null}
        {detailed && check?.status === 'failed' ? <p className="mt-1 text-[12px] text-subtle">The automatic check could not run on this file.</p> : null}
        {detailed && check?.summary ? (
          <p className="mt-2 text-[12px] text-subtle">
            <span className="micro-label mr-1.5">AI read</span>
            {check.documentType ? `${check.documentType}. ` : null}
            {check.summary}
          </p>
        ) : null}
      </div>

      {detailed && rows.length ? (
        <div className="overflow-x-auto border-t border-[rgba(0,0,0,.06)]">
          <table className="w-full min-w-[460px] text-left text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[1.1px] text-faint">
                <th className="px-4 py-2 font-semibold"> </th>
                <th className="px-2 py-2 font-semibold">Expected</th>
                <th className="px-2 py-2 font-semibold">On the certificate</th>
                <th className="px-4 py-2 font-semibold"><span className="sr-only">Result</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const res = RESULT[r.result];
                return (
                  <tr key={r.label} className="border-t border-[rgba(0,0,0,.05)] align-top">
                    <th scope="row" className="whitespace-nowrap px-4 py-2 font-semibold text-subtle">{r.label}</th>
                    <td className="px-2 py-2 text-body">{r.expected}</td>
                    <td className={cn('px-2 py-2', r.found ? 'text-ink' : 'italic text-faint')}>{r.found ?? 'not shown'}</td>
                    <td className="px-4 py-2 text-right">
                      <span title={res.label} aria-label={res.label} className="text-[14px] font-bold" style={{ color: res.color }}>
                        {res.mark}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {detailed && check?.tamperingSigns.length ? (
        <div className="border-t border-[rgba(0,0,0,.06)] px-4 py-2.5 text-[12px] text-pa-red">
          <span className="micro-label mr-1.5 !text-pa-red">Possible editing</span>
          {check.tamperingSigns.join('; ')}
        </div>
      ) : null}
    </section>
  );
}
