import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Page } from '@/components/layout/Page';
import { useDrillDown } from '@/components/shared/DrillDown';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { EmptyState, ProgressBar } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { errorMessage } from '@/lib/api-client';
import { periodSchema, requiredPeriodSchema, type PeriodValues } from '@/lib/forms';
import { formatDate, formatHours } from '@/lib/format';
import { C } from '@/lib/palette';
import type { MyReportKind } from '@/types/api';
import { useCycle } from '../cycles/CycleProvider';
import { downloadMyReport, useMyPlan } from './api';

const CARDS: { kind: MyReportKind; title: string; sub: string; color: string }[] = [
  { kind: 'all', title: 'Full completion report', sub: 'Every item assigned to me with status, hours, due dates and completion dates.', color: C.blue },
  { kind: 'period', title: 'Completed in period', sub: 'Filter by date range for CPD submissions and annual reviews.', color: C.green },
  { kind: 'outstanding', title: 'Outstanding learning', sub: 'Everything not yet evidenced, for planning and prioritising.', color: C.red },
];

export default function MyReportsPage() {
  const { data, isPending, error, refetch } = useMyPlan();
  const drill = useDrillDown();
  const [kind, setKind] = useState<MyReportKind | null>(null);

  if (isPending) return <Page title="My Reports" subtitle="CPD activity downloads"><PageSkeleton /></Page>;
  if (error || !data) return <Page title="My Reports"><ErrorState error={error} onRetry={() => void refetch()} /></Page>;

  const s = data.summary;
  const maxHours = Math.max(0.01, ...data.hoursByCategory.map((c) => c.hours));

  return (
    <Page title="My Reports" subtitle="CPD activity downloads">
      <div className="stagger space-y-5">
        <StatGrid>
          <StatCard label="Items completed" value={s.completed} note={`${s.assigned} assigned`} color={C.blue} />
          <StatCard label="Hours completed" value={s.hoursCompleted} note={`of ${s.hoursAssigned} required`} color={C.cyan} />
          <StatCard label="Mandatory done" value={s.mandatoryCompleted} note={`${s.mandatoryAssigned} mandatory items`} color={C.green} />
          <StatCard label="Outstanding" value={s.outstanding} note={`${s.mandatoryOutstanding} mandatory`} color={C.red} />
        </StatGrid>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <Panel key={c.kind} accent={c.color} className="flex flex-col">
              <h2 className="text-[15px] font-semibold text-ink">{c.title}</h2>
              <p className="mb-[18px] mt-2 flex-1 text-[13px] leading-[22px] text-[rgba(38,39,25,.65)]">{c.sub}</p>
              <Button variant="dark" size="lg" onClick={() => setKind(c.kind)}>
                Download
              </Button>
            </Panel>
          ))}
        </div>

        <Panel>
          <PanelHeader title="CPD hours by category" className="mb-4" />
          {data.hoursByCategory.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() =>
                drill({
                  title: c.category,
                  subtitle: `${c.hours} hours completed in this category`,
                  rows: data.entries
                    .filter((e) => e.status === 'completed' && e.item.category.name === c.category)
                    .map((e) => ({ key: e.item.id, primary: e.item.title, secondary: `${e.item.provider} · completed ${formatDate(e.completion?.completedOn)}`, meta: formatHours(e.item.hours), dot: C.green })),
                })
              }
              className="flex w-full cursor-pointer items-center gap-3.5 py-2 text-left"
            >
              <span className="w-[130px] shrink-0 text-[13px] sm:w-[190px]">{c.category}</span>
              <span className="flex-1">
                <ProgressBar pct={(c.hours / maxHours) * 100} color={C.blue} label={c.category} />
              </span>
              <span className="w-[60px] text-right text-[12px] font-semibold">{formatHours(c.hours)}</span>
            </button>
          ))}
          {data.hoursByCategory.length === 0 ? <EmptyState>No completed hours to summarise yet.</EmptyState> : null}
        </Panel>
      </div>
      <ReportDialog kind={kind} onClose={() => setKind(null)} pendingCount={s.outstanding} assignedCount={s.assigned} />
    </Page>
  );
}

function ReportDialog(props: { kind: MyReportKind | null; onClose: () => void; pendingCount: number; assignedCount: number }) {
  return props.kind ? <ReportDialogBody key={props.kind} {...props} kind={props.kind} /> : null;
}

function ReportDialogBody({
  kind,
  onClose,
  pendingCount,
  assignedCount,
}: {
  kind: MyReportKind;
  onClose: () => void;
  pendingCount: number;
  assignedCount: number;
}) {
  const toast = useToast();
  const { cycleId } = useCycle();
  const card = CARDS.find((c) => c.kind === kind);
  // "Completed in period" needs both dates; the other reports treat blank as "whole year".
  const schema = kind === 'period' ? requiredPeriodSchema : periodSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PeriodValues>({ resolver: zodResolver(schema), defaultValues: { from: '', to: '' }, mode: 'onChange' });

  const download = handleSubmit(async ({ from, to }) => {
    try {
      await downloadMyReport(kind, { cycleId, from: from || undefined, to: to || undefined });
      toast('Excel report downloaded.');
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });

  const summary =
    kind === 'outstanding'
      ? `${pendingCount} outstanding items will be included, with due dates and assigned hours.`
      : kind === 'period'
        ? 'Choose a date range. Only items evidenced inside the range are included.'
        : `${assignedCount} items will be included, with status, hours, due dates and completion dates. Leave the period blank for the whole year.`;

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSubmitting}
      title={card?.title ?? ''}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="dark" onClick={() => void download()} loading={isSubmitting}>
            Download Excel
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] leading-[22px] text-[rgba(38,39,25,.7)]">{summary}</p>
      <div className="grid grid-cols-2 gap-3.5">
        <TextField label="From" type="date" error={errors.from?.message} {...register('from')} />
        <TextField label="To" type="date" error={errors.to?.message} {...register('to')} />
      </div>
    </Modal>
  );
}
