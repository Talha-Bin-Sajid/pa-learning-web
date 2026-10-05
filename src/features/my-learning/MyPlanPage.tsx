import { useCallback, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { EvidenceViewer, type EvidenceTarget } from '@/components/shared/EvidenceViewer';
import { Panel } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { formatPct } from '@/lib/format';
import { C, progressColor } from '@/lib/palette';
import type { PlanEntry } from '@/types/api';
import { useMyPlan } from './api';
import { evidenceTarget } from './plan-visuals';
import { PlanCard } from './PlanCard';
import { UploadEvidenceDialog } from './UploadEvidenceDialog';

export default function MyPlanPage() {
  const { data, isPending, error, refetch } = useMyPlan();
  const [uploading, setUploading] = useState<PlanEntry | null>(null);
  const [viewing, setViewing] = useState<EvidenceTarget | null>(null);
  const onUpload = useCallback((e: PlanEntry) => setUploading(e), []);
  const onView = useCallback((e: PlanEntry) => setViewing(evidenceTarget(e)), []);

  const pending = data?.entries.filter((e) => e.status !== 'completed') ?? [];
  const done = data?.entries.filter((e) => e.status === 'completed') ?? [];

  return (
    <Page title="My Learning Plan" subtitle="Learning assigned to me">
      {isPending ? <PageSkeleton stats={0} panels={1} /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div className="stagger">
          <Panel className="mb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="micro-label">Read-only learning plan</div>
                <p className="mt-1.5 max-w-[640px] text-[13px] leading-[21px] text-[rgba(38,39,25,.65)]">
                  Items are set by the Learning Team. Open the learning link, then upload evidence to mark an
                  item complete.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[30px] font-semibold leading-[1.1] text-ink">
                  {formatPct(data.summary.completionPct)}
                </div>
                <div className="text-[12px] text-muted">
                  {data.summary.completed} of {data.summary.assigned} items · {data.summary.hoursCompleted} of{' '}
                  {data.summary.hoursAssigned} hours
                </div>
              </div>
            </div>
            <ProgressBar
              pct={data.summary.completionPct}
              color={progressColor(data.summary.completionPct)}
              height={12}
              label="My completion"
            />
          </Panel>

          {data.entries.length === 0 ? (
            <Panel className="py-12 text-center text-[14px] text-muted">
              No learning has been assigned to you yet.
            </Panel>
          ) : null}

          {pending.length ? (
            <section className="mb-6">
              <h2
                className="mb-3 text-[11px] font-semibold uppercase tracking-[1.4px]"
                style={{ color: C.red }}
              >
                Pending - {pending.length}
              </h2>
              {pending.map((e) => (
                <PlanCard key={e.item.id} entry={e} onUpload={onUpload} onView={onView} />
              ))}
            </section>
          ) : null}
          {done.length ? (
            <section>
              <h2
                className="mb-3 text-[11px] font-semibold uppercase tracking-[1.4px]"
                style={{ color: C.green }}
              >
                Completed - {done.length}
              </h2>
              {done.map((e) => (
                <PlanCard key={e.item.id} entry={e} onUpload={onUpload} onView={onView} />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
      <UploadEvidenceDialog entry={uploading} today={data?.today ?? ''} onClose={() => setUploading(null)} />
      <EvidenceViewer target={viewing} onClose={() => setViewing(null)} />
    </Page>
  );
}
