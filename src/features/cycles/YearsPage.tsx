import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Page } from '@/components/layout/Page';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatusText } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { api, ApiError, errorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { C } from '@/lib/palette';
import type { Cycle } from '@/types/api';
import { newYearSchema, type NewYearValues } from './cycle.schema';
import { CYCLES_KEY, useCyclesQuery } from './CycleProvider';

function useInvalidateEverything() {
  const qc = useQueryClient();
  // A new current year changes every page's default data.
  return () => qc.invalidateQueries();
}

function NewYearDialog({ open, onClose, cycles }: { open: boolean; onClose: () => void; cycles: Cycle[] }) {
  const toast = useToast();
  const invalidate = useInvalidateEverything();
  const latest = cycles[0];
  const nextYear = (latest?.year ?? new Date().getFullYear()) + 1;
  const schema = useMemo(() => newYearSchema(cycles.map((c) => c.year)), [cycles]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NewYearValues>({
    resolver: zodResolver(schema),
    defaultValues: { year: String(nextYear), copyFrom: latest?.id ?? '', makeCurrent: 'no' },
    mode: 'onChange',
  });

  const create = useMutation({
    mutationFn: (v: NewYearValues) =>
      api.post<Cycle & { copiedItems: number }>('/cycles', {
        year: Number(v.year),
        startsOn: `${v.year}-01-01`,
        endsOn: `${v.year}-12-31`,
        makeCurrent: v.makeCurrent === 'yes',
        ...(v.copyFrom ? { copyItemsFromCycleId: v.copyFrom } : {}),
      }),
    onSuccess: async (c) => {
      await invalidate();
      toast(`${c.year} programme created${c.copiedItems ? ` with ${c.copiedItems} items copied` : ''}.`);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'CYCLE_EXISTS') setError('year', { type: 'server', message: err.message });
      else toast(errorMessage(err), 'error');
    },
  });
  const submit = handleSubmit((v) => create.mutate(v));

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={create.isPending}
      title="Start a new learning year"
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            loading={create.isPending}
            onClick={() => void submit()}
          >
            Create year
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5">
        <TextField
          label="Year"
          inputMode="numeric"
          maxLength={4}
          error={errors.year?.message}
          {...register('year')}
          hint="Runs 1 January to 31 December"
        />
        <SelectField
          label="Copy learning template from"
          {...register('copyFrom')}
          options={[
            { value: '', label: 'Start empty' },
            ...cycles.map((c) => ({ value: c.id, label: `${c.year} - due dates moved forward a year` })),
          ]}
        />
        <SelectField
          label="Make it the current year now?"
          {...register('makeCurrent')}
          options={[
            { value: 'no', label: 'Not yet - prepare it in advance' },
            { value: 'yes', label: 'Yes - everyone switches to it' },
          ]}
        />
      </div>
    </Modal>
  );
}

export default function YearsPage() {
  const cycles = useCyclesQuery();
  const toast = useToast();
  const invalidate = useInvalidateEverything();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const makeCurrent = useMutation({
    mutationFn: (id: string) => api.patch<Cycle>(`/cycles/${id}`, { makeCurrent: true }),
    onSuccess: async (c) => {
      await qc.invalidateQueries({ queryKey: CYCLES_KEY });
      await invalidate();
      toast(`${c.year} is now the current learning year.`);
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  });

  return (
    <Page
      title="Learning Years"
      subtitle="Programme cycles and the current year"
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          New year
        </Button>
      }
    >
      {cycles.isPending ? <PageSkeleton stats={0} panels={1} /> : null}
      {cycles.error ? <ErrorState error={cycles.error} onRetry={() => void cycles.refetch()} /> : null}
      {cycles.data ? (
        <Panel className="animate-fade-up">
          <PanelHeader
            title="Programme years"
            subtitle="Learning items belong to a year. The current year is what everyone sees by default."
            className="mb-4"
          />
          {cycles.data.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 border-b border-line py-3.5">
              <div className="w-[70px] text-[22px] font-semibold text-ink">{c.year}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{c.name}</div>
                <div className="text-[11px] text-muted">
                  {formatDate(c.startsOn)} – {formatDate(c.endsOn)}
                </div>
              </div>
              {c.isCurrent ? (
                <StatusText color={C.green}>Current year</StatusText>
              ) : (
                <Button
                  loading={makeCurrent.isPending && makeCurrent.variables === c.id}
                  onClick={() => makeCurrent.mutate(c.id)}
                >
                  Make current
                </Button>
              )}
            </div>
          ))}
        </Panel>
      ) : null}
      {cycles.data ? (
        <NewYearDialog key={String(open)} open={open} onClose={() => setOpen(false)} cycles={cycles.data} />
      ) : null}
    </Page>
  );
}
