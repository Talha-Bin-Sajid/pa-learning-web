import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DonutChart } from '@/components/charts/DonutChart';
import { Page } from '@/components/layout/Page';
import { useDrillDown, type DrillRow } from '@/components/shared/DrillDown';
import { EvidenceViewer, type EvidenceTarget } from '@/components/shared/EvidenceViewer';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { EmptyState, ListRow, ProgressBar } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { formatDate, formatHours, formatPct } from '@/lib/format';
import { C } from '@/lib/palette';
import type { PlanEntry } from '@/types/api';
import { useMyPlan } from './api';
import { evidenceTarget } from './plan-visuals';
import { UploadEvidenceDialog } from './UploadEvidenceDialog';

const row = (e: PlanEntry): DrillRow => ({
  key: e.item.id,
  primary: e.item.title,
  secondary: `${e.item.deliveryType.name} · ${e.item.provider} · ${e.completion ? `completed ${formatDate(e.completion.completedOn)}` : `due ${formatDate(e.item.dueDate)}`}`,
  meta: formatHours(e.item.hours),
  dot: e.status === 'completed' ? C.green : e.item.isMandatory ? C.red : C.blue,
});

export default function MyDashboardPage() {
  const { data, isPending, error, refetch } = useMyPlan();
  const drill = useDrillDown();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState<PlanEntry | null>(null);
  const [viewing, setViewing] = useState<EvidenceTarget | null>(null);

  if (isPending)
    return (
      <Page title="My Dashboard" subtitle="My learning progress">
        <PageSkeleton stats={3} />
      </Page>
    );
  if (error || !data)
    return (
      <Page title="My Dashboard">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );

  const s = data.summary;
  const done = data.entries.filter((e) => e.status === 'completed');
  const pending = data.entries.filter((e) => e.status !== 'completed');
  const optionalPending = pending.filter((e) => !e.item.isMandatory);
  const mandatoryPending = pending.filter((e) => e.item.isMandatory);
  const overdue = pending.filter((e) => e.status === 'overdue');

  const groups = [
    {
      key: 'done',
      label: `${done.length} items completed`,
      value: done.length,
      color: C.green,
      title: 'Completed learning',
      sub: `${done.length} items · ${s.hoursCompleted} hours`,
      list: done,
    },
    {
      key: 'pending',
      label: `${optionalPending.length} items pending`,
      value: optionalPending.length,
      color: C.blue,
      title: 'Pending learning',
      sub: `${optionalPending.length} optional items outstanding`,
      list: optionalPending,
    },
    {
      key: 'mand',
      label: `${mandatoryPending.length} mandatory outstanding`,
      value: mandatoryPending.length,
      color: C.red,
      title: 'Mandatory outstanding',
      sub: `${mandatoryPending.length} compliance items still to evidence`,
      list: mandatoryPending,
    },
  ].map((g) => ({ ...g, onClick: () => drill({ title: g.title, subtitle: g.sub, rows: g.list.map(row) }) }));

  return (
    <Page title="My Dashboard" subtitle={`My learning progress - ${data.cycle.year}`}>
      <div className="stagger space-y-5">
        {overdue.length ? (
          <button
            type="button"
            onClick={() =>
              drill({
                title: 'Overdue learning',
                subtitle: `${overdue.length} items past their due date`,
                rows: overdue.map(row),
              })
            }
            className="block w-full cursor-pointer bg-white px-5 py-4 text-left text-[13px] leading-[22px] shadow-card"
            style={{ borderLeft: `3px solid ${C.red}` }}
          >
            <strong style={{ color: C.red }}>{overdue.length} overdue</strong> -{' '}
            {overdue.map((e) => e.item.title).join(', ')}
          </button>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr]">
          <Panel className="flex flex-wrap items-center gap-6 md:col-span-2 xl:col-span-1">
            <DonutChart
              segments={groups}
              size={150}
              radius={58}
              stroke={16}
              centerValue={formatPct(s.completionPct)}
              centerLabel="Complete"
            />
            <ul className="flex flex-col gap-3">
              {groups.map((g) => (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={g.onClick}
                    className="flex cursor-pointer items-center gap-2.5 text-[13px] hover:text-ink"
                  >
                    <span className="size-3 shrink-0" style={{ background: g.color }} />
                    <span>{g.label}</span>
                    <span className="text-[11px] tracking-[1.1px] text-subtle">VIEW</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <button
            type="button"
            onClick={() =>
              drill({
                title: 'Hours completed',
                subtitle: `${s.hoursCompleted} of ${s.hoursAssigned} assigned hours evidenced`,
                rows: done.map(row),
              })
            }
            className="cursor-pointer bg-white p-6 text-left shadow-card"
            style={{ borderTop: `3px solid ${C.teal}` }}
          >
            <div className="micro-label">Hours completed</div>
            <div className="mt-2.5 text-[44px] font-semibold leading-[1.1] text-ink">{s.hoursCompleted}</div>
            <div className="mb-4 text-[12px] text-muted">
              of {s.hoursAssigned} hours assigned
              {s.underReview ? ` · ${s.underReview} under review` : ''}
            </div>
            <ProgressBar
              pct={s.hoursAssigned ? (s.hoursCompleted / s.hoursAssigned) * 100 : 0}
              color={C.teal}
              label="Hours completed"
            />
          </button>

          <button
            type="button"
            onClick={() =>
              drill({
                title: 'Mandatory outstanding',
                subtitle: `${mandatoryPending.length} compliance items still to evidence`,
                rows: mandatoryPending.map(row),
              })
            }
            className="cursor-pointer bg-white p-6 text-left shadow-card"
            style={{ borderTop: `3px solid ${mandatoryPending.length ? C.red : C.green}` }}
          >
            <div className="micro-label">Mandatory outstanding</div>
            <div className="mt-2.5 text-[44px] font-semibold leading-[1.1] text-ink">
              {s.mandatoryOutstanding}
            </div>
            <div className="text-[12px]" style={{ color: mandatoryPending.length ? C.red : C.green }}>
              {mandatoryPending.length ? 'Complete these first' : 'All mandatory learning done'}
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Recent completions"
              actions={
                <Button variant="link" onClick={() => navigate('/my/plan')}>
                  My plan
                </Button>
              }
              className="mb-3.5"
            />
            {done.slice(0, 5).map((e) => (
              <ListRow
                key={e.item.id}
                primary={
                  <span>
                    {e.item.title}{' '}
                    <span className="font-normal text-muted">· {formatHours(e.item.hours)}</span>
                  </span>
                }
                secondary={formatDate(e.completion?.completedOn)}
                onClick={() => setViewing(evidenceTarget(e, formatHours(e.item.hours)))}
              />
            ))}
            {done.length === 0 ? <EmptyState>Nothing logged yet.</EmptyState> : null}
          </Panel>
          <Panel>
            <PanelHeader
              title="Up next"
              actions={
                <Button variant="link" onClick={() => navigate('/my/reports')}>
                  My reports
                </Button>
              }
              className="mb-3.5"
            />
            {pending.slice(0, 5).map((e) => (
              <ListRow
                key={e.item.id}
                dot={e.item.isMandatory ? C.red : C.blue}
                primary={e.item.title}
                secondary={`Due ${formatDate(e.item.dueDate)} · ${formatHours(e.item.hours)}`}
                secondaryColor={e.status === 'overdue' ? C.red : undefined}
                onClick={() => setUploading(e)}
              />
            ))}
            {pending.length === 0 ? (
              <EmptyState tone="success">Everything assigned is complete.</EmptyState>
            ) : null}
          </Panel>
        </div>
      </div>
      <UploadEvidenceDialog entry={uploading} today={data.today} onClose={() => setUploading(null)} />
      <EvidenceViewer target={viewing} onClose={() => setViewing(null)} />
    </Page>
  );
}
