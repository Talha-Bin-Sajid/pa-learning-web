import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { DonutChart, DonutLegend, type DonutSegment } from '@/components/charts/DonutChart';
import { MonthBars } from '@/components/charts/MonthBars';
import { Page } from '@/components/layout/Page';
import { useDrillDown, type DrillRow } from '@/components/shared/DrillDown';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { Avatar, Dot, EmptyState, ProgressBar } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { formatDate, formatHours, formatPct, monthLabel } from '@/lib/format';
import { C, CATEGORY_COLORS, progressColor } from '@/lib/palette';
import type { MemberProgress, Overview } from '@/types/api';
import { usePermissions } from '../auth/AuthProvider';
import { useOverview } from '../team/api';

function memberRow(m: MemberProgress): DrillRow {
  const s = m.summary;
  return {
    key: m.person.id,
    primary: m.person.fullName,
    secondary: `${m.person.designation?.name ?? 'No designation'} · ${s.completed}/${s.assigned} items (${s.confirmed} confirmed) · ${s.hoursCompleted} of ${s.hoursAssigned} hours${s.overdue ? ` · ${s.overdue} overdue` : ''}`,
    meta: formatPct(s.completionPct),
    dot: s.completionPct >= 100 ? C.green : s.overdue ? C.red : C.blue,
  };
}

/** Drill-down builders for every clickable number on the dashboard. */
function useDrills(o: Overview | undefined) {
  const drill = useDrillDown();
  return useMemo(() => {
    if (!o) return null;
    const outstandingRows = (onlyOverdue: boolean) =>
      o.outstanding
        .filter((x) => !onlyOverdue || x.overdue)
        .map((x) => ({
          key: `${x.personId}-${x.itemId}`,
          primary: x.title,
          secondary: `${x.personName} · due ${formatDate(x.dueDate)}${x.isMandatory ? ' · mandatory' : ''}`,
          meta: formatHours(x.hours),
          dot: x.overdue ? C.red : C.blue,
        }));
    const evidenceRows = (list: Overview['evidence']) =>
      list.map((e) => ({
        key: e.completionId,
        primary: e.title,
        secondary: `${e.personName} · ${e.fileName ?? 'acknowledged'}`,
        meta: formatDate(e.completedOn),
        dot: C.green,
      }));
    const evidenceExport = (list: Overview['evidence']) => [
      ['Member', 'Activity', 'Hours', 'Completed', 'Evidence File', 'Reflection'],
      ...list.map((e) => [e.personName, e.title, e.hours, e.completedOn, e.fileName, e.reflection]),
    ];

    return {
      items: (category?: string) => {
        const list = category ? o.items.filter((r) => r.item.category.name === category) : o.items;
        const hours = list.reduce((a, r) => a + r.item.hours, 0);
        drill({
          title: category ?? `Learning items - ${o.cycle.year}`,
          subtitle: `${list.length} items · ${Math.round(hours * 100) / 100} hours`,
          rows: list.map(({ item, assignedCount, completedCount, confirmedCount }) => ({
            key: item.id,
            primary: item.title,
            secondary: `${item.deliveryType.name} · ${item.provider} · due ${formatDate(item.dueDate)} · ${completedCount}/${assignedCount} done (${confirmedCount} confirmed)`,
            meta: formatHours(item.hours),
            dot: item.isMandatory ? C.red : C.blue,
          })),
          exportRows: [
            [
              'Activity',
              'Category',
              'Delivery',
              'Provider',
              'Hours',
              'Due Date',
              'Mandatory',
              'Assigned',
              'Completed',
              'Confirmed',
            ],
            ...list.map(({ item, assignedCount, completedCount, confirmedCount }) => [
              item.title,
              item.category.name,
              item.deliveryType.name,
              item.provider,
              item.hours,
              item.dueDate,
              item.isMandatory ? 'Yes' : 'No',
              assignedCount,
              completedCount,
              confirmedCount,
            ]),
          ],
        });
      },
      members: () =>
        drill({
          title: o.scope === 'team' ? 'My team' : 'Team members',
          subtitle: `${o.kpis.memberCount} people with learning assigned`,
          rows: o.members.map(memberRow),
          exportRows: [
            [
              'Member',
              'Email',
              'Designation',
              'Items Assigned',
              'Items Completed',
              'Items Confirmed',
              'Under Review',
              'Hours Completed',
              'Completion %',
              'Confirmed %',
            ],
            ...o.members.map((m) => [
              m.person.fullName,
              m.person.email,
              m.person.designation?.name ?? '',
              m.summary.assigned,
              m.summary.completed,
              m.summary.confirmed,
              m.summary.underReview,
              m.summary.hoursCompleted,
              m.summary.completionPct,
              m.summary.confirmedPct,
            ]),
          ],
        }),
      outstanding: (onlyOverdue = false) =>
        drill({
          title: onlyOverdue ? 'Overdue learning' : 'Outstanding learning',
          subtitle: `${outstandingRows(onlyOverdue).length} items still to evidence`,
          rows: outstandingRows(onlyOverdue),
          exportRows: [
            ['Activity', 'Member', 'Due Date', 'Hours', 'Mandatory', 'Overdue'],
            ...o.outstanding
              .filter((x) => !onlyOverdue || x.overdue)
              .map((x) => [
                x.title,
                x.personName,
                x.dueDate,
                x.hours,
                x.isMandatory ? 'Yes' : 'No',
                x.overdue ? 'Yes' : 'No',
              ]),
          ],
        }),
      evidence: () =>
        drill({
          title: 'Evidence filed',
          subtitle: `${o.evidence.length} completions on record`,
          rows: evidenceRows(o.evidence),
          exportRows: evidenceExport(o.evidence),
        }),
      month: (month: string) => {
        const list = o.evidence.filter((e) => e.completedOn.startsWith(month));
        drill({
          title: `Evidence filed - ${monthLabel(month)} ${month.slice(0, 4)}`,
          subtitle: `${list.length} completions recorded`,
          rows: evidenceRows(list),
          exportRows: evidenceExport(list),
        });
      },
      item: (row: Overview['items'][number]) => {
        const done = o.evidence.filter((e) => e.itemId === row.item.id);
        const waiting = o.outstanding.filter((x) => x.itemId === row.item.id);
        drill({
          title: row.item.title,
          subtitle: `${row.item.deliveryType.name} · ${row.item.provider} · ${formatHours(row.item.hours)} · ${row.item.isMandatory ? 'mandatory' : 'optional'}`,
          rows: [
            ...done.map((e) => ({
              key: e.completionId,
              primary: e.personName,
              secondary: `Completed ${formatDate(e.completedOn)}${e.fileName ? ` · ${e.fileName}` : ''}`,
              meta: 'Done',
              dot: C.green,
            })),
            ...waiting.map((x) => ({
              key: x.personId,
              primary: x.personName,
              secondary: `Outstanding · due ${formatDate(x.dueDate)}`,
              meta: 'Pending',
              dot: x.overdue ? C.red : C.blue,
            })),
          ],
        });
      },
    };
  }, [o, drill]);
}

export default function DashboardPage() {
  const { data: o, isPending, error, refetch } = useOverview();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const drills = useDrills(o);

  const categories = useMemo<DonutSegment[]>(() => {
    if (!o || !drills) return [];
    const byCat = new Map<string, Overview['items']>();
    for (const row of o.items)
      byCat.set(row.item.category.name, [...(byCat.get(row.item.category.name) ?? []), row]);
    return [...byCat].map(([name, rows], i) => ({
      key: name,
      label: name,
      value: rows.length,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]!,
      onClick: () => drills.items(name),
    }));
  }, [o, drills]);

  const title = 'Dashboard';
  if (isPending)
    return (
      <Page title={title} subtitle="Learning programme overview">
        <PageSkeleton />
      </Page>
    );
  if (error || !o || !drills)
    return (
      <Page title={title}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Page>
    );

  const k = o.kpis;
  const onTrack = k.averageCompletionPct >= 70;

  return (
    <Page
      title={title}
      subtitle={`${o.scope === 'team' ? 'My team' : 'Learning programme overview'} - ${o.cycle.year}`}
    >
      <div className="stagger space-y-5">
        {permissions.decideEvidence && o.reviewQueue.waitingOverDays > 0 ? (
          <button
            type="button"
            onClick={() => navigate('/evidence')}
            className="block w-full cursor-pointer bg-white px-5 py-4 text-left text-[13px] leading-[22px] shadow-card"
            style={{ borderLeft: `3px solid ${C.amber}` }}
          >
            <strong style={{ color: C.amber }}>
              {o.reviewQueue.waitingOverDays} evidence submission{o.reviewQueue.waitingOverDays === 1 ? '' : 's'} waiting over{' '}
              {o.reviewQueue.overDays} days
            </strong>{' '}
            - {o.reviewQueue.waiting} in the review queue. Open Evidence Review →
          </button>
        ) : null}
        <StatGrid>
          <StatCard
            label="Learning items"
            value={k.itemCount}
            note={`${k.mandatoryItemCount} mandatory - click to list`}
            color={C.purple}
            onClick={() => drills.items()}
          />
          <StatCard
            label={o.scope === 'team' ? 'My team' : 'Team members'}
            value={k.memberCount}
            note="Click for member breakdown"
            color={C.blue}
            onClick={drills.members}
          />
          <StatCard
            label="Avg completion"
            value={formatPct(k.averageCompletionPct)}
            note={`${formatPct(k.averageConfirmedPct)} confirmed · ${onTrack ? 'on track' : 'needs attention'}`}
            noteColor={onTrack ? C.green : C.red}
            color={C.green}
            onClick={() => drills.outstanding()}
          />
          <StatCard
            label="Evidence filed"
            value={k.evidenceCount}
            note={k.underReviewCount ? `${k.confirmedCount} confirmed · ${k.underReviewCount} under review` : `${k.confirmedCount} confirmed`}
            color={C.cyan}
            onClick={drills.evidence}
          />
        </StatGrid>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
          <Panel>
            <PanelHeader
              title={o.scope === 'team' ? 'Team completion' : 'Team completion'}
              actions={
                <Button variant="link" onClick={() => navigate('/team')}>
                  Details
                </Button>
              }
              className="mb-4"
            />
            {o.members.map((m) => (
              <button
                key={m.person.id}
                type="button"
                onClick={() => navigate(`/team/${m.person.id}`)}
                className="flex w-full cursor-pointer items-center gap-3 py-[7px] text-left"
              >
                <span className="flex w-[130px] shrink-0 items-center gap-2 sm:w-[170px]">
                  <Avatar initials={m.person.initials} color={m.person.avatarColor} size={26} />
                  <span className="truncate text-[13px]">{m.person.fullName}</span>
                </span>
                <span className="flex-1">
                  <ProgressBar
                    pct={m.summary.completionPct}
                    color={progressColor(m.summary.completionPct)}
                    label={m.person.fullName}
                  />
                </span>
                <span className="w-11 text-right text-[12px] font-semibold">
                  {formatPct(m.summary.completionPct)}
                </span>
                <span className="hidden w-[52px] text-right text-[11px] text-faint sm:inline">
                  {m.summary.completed}/{m.summary.assigned}
                </span>
              </button>
            ))}
            {o.members.length === 0 ? (
              <EmptyState>No one in view has learning assigned yet.</EmptyState>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader
              title="Learning template"
              actions={
                permissions.manageItems ? (
                  <Button variant="link" onClick={() => navigate('/template')}>
                    Manage
                  </Button>
                ) : undefined
              }
              className="mb-4"
            />
            {o.items.slice(0, 7).map((row) => (
              <button
                key={row.item.id}
                type="button"
                onClick={() => drills.item(row)}
                className="flex w-full cursor-pointer items-start gap-[11px] border-b border-line py-[9px] text-left"
              >
                <Dot color={row.item.isMandatory ? C.red : C.blue} />
                <span className="text-[13px] leading-5">
                  <span className="font-medium">{row.item.title}</span>
                  <span className="text-muted">
                    {' '}
                    - {formatHours(row.item.hours)} · {row.item.deliveryType.name}
                  </span>
                </span>
              </button>
            ))}
            {o.items.length === 0 ? <EmptyState>No learning items yet.</EmptyState> : null}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.3fr]">
          <Panel>
            <PanelHeader
              title="Items by category"
              subtitle="Click a segment to list the items"
              className="mb-[18px]"
            />
            <div className="flex flex-wrap items-center gap-6">
              <DonutChart segments={categories} centerValue={String(k.itemCount)} centerLabel="Items" />
              <div className="min-w-[180px] flex-1">
                <DonutLegend segments={categories} />
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader
              title="Evidence filed by month"
              subtitle="Click a column to see the completions in that month"
              className="mb-[22px]"
            />
            <MonthBars data={o.evidenceByMonth} onSelect={drills.month} />
          </Panel>
        </div>
      </div>
    </Page>
  );
}
