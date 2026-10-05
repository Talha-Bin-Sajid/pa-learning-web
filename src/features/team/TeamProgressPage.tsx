import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Page } from '@/components/layout/Page';
import { EvidenceViewer, type EvidenceTarget } from '@/components/shared/EvidenceViewer';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { Avatar, EmptyState, ListRow } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { cn } from '@/lib/cn';
import { formatPct } from '@/lib/format';
import { C } from '@/lib/palette';
import { entryVisuals, evidenceTarget } from '../my-learning/plan-visuals';
import { useMemberPlan, useMembers } from './api';

export default function TeamProgressPage() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const members = useMembers();
  const selectedId = profileId ?? members.data?.[0]?.person.id;
  const plan = useMemberPlan(selectedId);
  const [viewing, setViewing] = useState<EvidenceTarget | null>(null);

  if (members.isPending) return <Page title="Team Progress" subtitle="Completion status by member"><PageSkeleton /></Page>;
  if (members.error) return <Page title="Team Progress"><ErrorState error={members.error} onRetry={() => void members.refetch()} /></Page>;

  const list = members.data ?? [];
  const p = plan.data;
  const done = p?.entries.filter((e) => e.status === 'completed') ?? [];
  const pending = p?.entries.filter((e) => e.status !== 'completed') ?? [];

  return (
    <Page title="Team Progress" subtitle="Completion status by member">
      {list.length === 0 ? (
        <Panel className="py-12 text-center text-[14px] text-muted">No one in your view has learning assigned yet.</Panel>
      ) : (
        <>
          <div role="tablist" aria-label="Team members" className="mb-[22px] flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            {list.map((m) => {
              const active = m.person.id === selectedId;
              return (
                <button
                  key={m.person.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => navigate(`/team/${m.person.id}`)}
                  className={cn(
                    'flex shrink-0 cursor-pointer items-center gap-2 border px-3.5 py-2 transition-colors',
                    active ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-body hover:border-ink',
                  )}
                >
                  <Avatar initials={m.person.initials} color={m.person.avatarColor} size={22} />
                  <span className="text-[13px] font-medium">{m.person.fullName.split(' ')[0]}</span>
                  <span className="text-[11px] opacity-65">{formatPct(m.summary.completionPct)}</span>
                </button>
              );
            })}
          </div>

          {plan.isPending ? <PageSkeleton /> : null}
          {plan.error ? <ErrorState error={plan.error} onRetry={() => void plan.refetch()} /> : null}
          {p ? (
            <div key={p.person.id} className="stagger space-y-5">
              <StatGrid>
                <StatCard label="Assigned" value={p.summary.assigned} note={p.person.designation?.name ?? 'No designation'} color={C.blue} />
                <StatCard
                  label="Completed"
                  value={p.summary.completed}
                  note={`${p.summary.confirmed} confirmed${p.summary.underReview ? ` · ${p.summary.underReview} under review` : ''} · ${p.summary.hoursCompleted} h`}
                  color={C.green}
                />
                <StatCard label="Pending" value={p.summary.outstanding} note={`${p.summary.hoursOutstanding} hours outstanding`} color={C.red} />
                <StatCard label="Completion" value={formatPct(p.summary.completionPct)} note={p.person.fullName} color={C.purple} />
              </StatGrid>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel>
                  <h2 className="mb-3.5 text-[15px] font-semibold text-ink">
                    Completed <span className="text-[rgba(38,39,25,.45)]">{done.length}</span>
                  </h2>
                  {done.map((e) => (
                    <ListRow
                      key={e.item.id}
                      dot={entryVisuals(e).dot}
                      primary={e.item.title}
                      secondary={entryVisuals(e).meta}
                      right={
                        <Button size="sm" onClick={() => setViewing(evidenceTarget(e, p.person.fullName))}>
                          View
                        </Button>
                      }
                    />
                  ))}
                  {done.length === 0 ? <EmptyState>Nothing completed yet.</EmptyState> : null}
                </Panel>
                <Panel>
                  <h2 className="mb-3.5 text-[15px] font-semibold text-ink">
                    Pending <span className="text-[rgba(38,39,25,.45)]">{pending.length}</span>
                  </h2>
                  {pending.map((e) => {
                    const v = entryVisuals(e);
                    return <ListRow key={e.item.id} dot={v.dot} primary={e.item.title} secondary={v.meta} secondaryColor={e.status === 'overdue' ? C.red : undefined} />;
                  })}
                  {pending.length === 0 ? <EmptyState tone="success">All assigned learning complete.</EmptyState> : null}
                </Panel>
              </div>
            </div>
          ) : null}
        </>
      )}
      <EvidenceViewer target={viewing} onClose={() => setViewing(null)} />
    </Page>
  );
}
