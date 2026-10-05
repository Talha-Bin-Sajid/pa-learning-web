import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Page } from '@/components/layout/Page';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { ProgressBar } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { errorMessage } from '@/lib/api-client';
import { periodSchema, type PeriodValues } from '@/lib/forms';
import { formatDate, formatPct } from '@/lib/format';
import { C, progressColor } from '@/lib/palette';
import type { TeamReportKind } from '@/types/api';
import { useCycle } from '../cycles/CycleProvider';
import { downloadTeamReport, useOverview } from './api';

const EXPORTS: { kind: TeamReportKind; label: string; sub: string; color: string }[] = [
  {
    kind: 'log',
    label: 'Full learning log',
    sub: 'Every person and item: required, completed, outstanding, hours, due date, date completed, days overdue and evidence',
    color: C.ink,
  },
  {
    kind: 'completion',
    label: 'Team completion report',
    sub: 'Summary sheet plus member-by-item detail',
    color: C.blue,
  },
  {
    kind: 'mandatory',
    label: 'Mandatory items status',
    sub: 'Compliance-critical learning only',
    color: C.red,
  },
  { kind: 'outstanding', label: 'Outstanding learning', sub: 'Items not yet evidenced', color: C.purple },
  {
    kind: 'icaew',
    label: 'ICAEW CPD log',
    sub: 'Completed activity with hours, verifiable flag and reflection',
    color: C.teal,
  },
  {
    kind: 'acca',
    label: 'ACCA CPD log',
    sub: 'Units (1 unit = 1 hour), verifiable flag and learning outcome',
    color: C.cyan,
  },
];

export default function ReportsPage() {
  const { data: o, isPending, error, refetch } = useOverview();
  const { cycle, cycleId } = useCycle();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<TeamReportKind | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PeriodValues>({ resolver: zodResolver(periodSchema), defaultValues: { from: '', to: '' }, mode: 'onChange' });
  const [from, to] = watch(['from', 'to']);

  const year = cycle?.year ?? new Date().getFullYear();
  const invalid = !!errors.from || !!errors.to;
  const presets = [
    { label: 'This quarter', apply: () => quarter(o?.today) },
    { label: 'Year to date', apply: () => ({ from: `${year}-01-01`, to: o?.today ?? '' }) },
    { label: 'Clear', apply: () => ({ from: '', to: '' }) },
  ];

  const run = (kind: TeamReportKind) =>
    handleSubmit(async (period) => {
      setBusy(kind);
      try {
        await downloadTeamReport(kind, { cycleId, from: period.from || undefined, to: period.to || undefined });
        toast(`Excel report downloaded - ${periodLabel(period.from, period.to)}.`);
      } catch (err) {
        toast(errorMessage(err), 'error');
      } finally {
        setBusy(null);
      }
    })();

  return (
    <Page
      title="Reports"
      subtitle={o?.scope === 'team' ? 'Exports for my team' : 'Firm-wide analytics and export'}
    >
      <div className="stagger space-y-5">
        <Panel className="flex flex-wrap items-end gap-[18px]">
          <div>
            <div className="micro-label">Reporting period</div>
            <div className="mt-1 text-[12px] text-muted">
              Exports count completions dated inside this range
            </div>
          </div>
          <TextField
            label="From"
            type="date"
            className="w-[160px]"
            error={errors.from?.message}
            {...register('from')}
          />
          <TextField
            label="To"
            type="date"
            className="w-[160px]"
            error={errors.to?.message}
            {...register('to')}
          />
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                onClick={() => reset(p.apply())}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="min-w-[180px] flex-1 text-right text-[12px] text-[rgba(38,39,25,.6)]">
            Currently exporting: {periodLabel(from, to)}
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Exports" className="mb-4" />
            {EXPORTS.map((e) => (
              <button
                key={e.kind}
                type="button"
                onClick={() => void run(e.kind)}
                disabled={invalid || busy !== null}
                className="mb-2.5 block w-full cursor-pointer border border-[rgba(0,0,0,.12)] bg-white px-4 py-3.5 text-left text-[13px] font-medium text-body transition-colors hover:bg-panel disabled:cursor-wait disabled:opacity-60"
                style={{ borderLeft: `3px solid ${e.color}` }}
              >
                {busy === e.kind ? 'Preparing…' : e.label}
                <span className="mt-0.5 block text-[11px] font-normal text-faint">Excel - {e.sub}</span>
              </button>
            ))}
          </Panel>

          <Panel>
            <PanelHeader title="Completion by member" className="mb-[18px]" />
            {isPending ? <PageSkeleton stats={0} panels={1} /> : null}
            {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
            {o?.members.map((m) => (
              <button
                key={m.person.id}
                type="button"
                onClick={() => navigate(`/team/${m.person.id}`)}
                className="flex w-full cursor-pointer items-center gap-3 py-[7px] text-left"
              >
                <span className="w-[120px] shrink-0 truncate text-[13px] sm:w-[150px]">
                  {m.person.fullName}
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
              </button>
            ))}
            {o ? (
              <div className="mt-[22px] border-t border-[rgba(0,0,0,.1)] pt-[18px]">
                <div className="micro-label">
                  Hours logged {o.scope === 'team' ? 'by my team' : 'across the firm'}
                </div>
                <div className="mt-2 text-[44px] font-semibold leading-[1.1] text-ink">
                  {o.kpis.hoursLogged}
                </div>
                <div className="text-[12px] text-muted">
                  Across {o.kpis.memberCount} members and {o.kpis.itemCount} active items
                </div>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function periodLabel(from: string, to: string): string {
  if (!from && !to) return 'the whole programme year';
  return `${from ? formatDate(from) : 'the start'} to ${to ? formatDate(to) : 'today'}`;
}

function quarter(today: string | undefined): { from: string; to: string } {
  const d = today ?? new Date().toISOString().slice(0, 10);
  const y = Number(d.slice(0, 4));
  const q = Math.floor((Number(d.slice(5, 7)) - 1) / 3);
  const start = `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(y, q * 3 + 3, 0)).toISOString().slice(0, 10);
  return { from: start, to: end };
}
