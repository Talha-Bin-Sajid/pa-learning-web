import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Field';
import { FileDrop } from '@/components/ui/FileDrop';
import { Modal } from '@/components/ui/Modal';
import { ApiError, errorMessage } from '@/lib/api-client';
import { formatBytes, formatHours } from '@/lib/format';
import { LIMITS } from '@/lib/forms';
import type { PlanEntry } from '@/types/api';
import { useSubmitEvidence } from './api';
import { evidenceSchema, type EvidenceValues } from './evidence.schema';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf';
const FILE_ERROR_CODES = ['UNSUPPORTED_FILE_TYPE', 'FILE_TOO_LARGE', 'EVIDENCE_REQUIRED', 'EMPTY_FILE'];

interface Props {
  entry: PlanEntry | null;
  today: string;
  onClose: () => void;
}

/** Mark an item complete: date, reflection and (for certificate items) a file. */
export function UploadEvidenceDialog({ entry, today, onClose }: Props) {
  return entry ? <DialogBody key={entry.item.id} entry={entry} today={today} onClose={onClose} /> : null;
}

function DialogBody({ entry, today, onClose }: { entry: PlanEntry; today: string; onClose: () => void }) {
  const toast = useToast();
  const submit = useSubmitEvidence();
  const { item, completion } = entry;
  const acknowledgement = item.evidenceMode === 'acknowledgement';
  const schema = useMemo(
    () => evidenceSchema({ today, needsFile: !acknowledgement && !completion?.evidence }),
    [today, acknowledgement, completion?.evidence],
  );
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<EvidenceValues>({
    resolver: zodResolver(schema),
    defaultValues: { completedOn: completion?.completedOn ?? today, reflection: completion?.reflection ?? '', file: null },
  });
  const file = watch('file');

  const save = handleSubmit(async (v) => {
    try {
      await submit.mutateAsync({ itemId: item.id, completedOn: v.completedOn, reflection: v.reflection, file: v.file });
      toast(completion ? 'Evidence updated.' : 'Marked complete. Evidence saved.');
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code.startsWith('COMPLETION_')) setError('completedOn', { type: 'server', message: err.message });
      else if (err instanceof ApiError && FILE_ERROR_CODES.includes(err.code)) setError('file', { type: 'server', message: err.message });
      else toast(errorMessage(err), 'error');
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      busy={submit.isPending}
      title={
        acknowledgement
          ? 'Confirm completion'
          : completion
            ? 'Replace evidence'
            : 'Upload completion evidence'
      }
      footer={
        <>
          <Button size="lg" onClick={onClose} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button size="lg" variant="success" onClick={() => void save()} loading={submit.isPending}>
            {acknowledgement ? 'Confirm complete' : 'Mark complete'}
          </Button>
        </>
      }
    >
      <div className="mb-[18px] bg-panel px-4 py-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-[1.3px] text-faint">Activity</div>
        <div className="mt-1 text-[14px] font-semibold text-ink">{item.title}</div>
        <div className="mt-0.5 text-[12px] text-muted">
          {item.deliveryType.name} · {formatHours(item.hours)} · {item.provider}
        </div>
      </div>
      <div className="space-y-3.5">
        <TextField
          label="Date completed"
          type="date"
          max={today}
          error={errors.completedOn?.message}
          {...register('completedOn')}
        />
        <TextArea
          label="Reflection"
          placeholder="What was learned, and how it will be applied."
          maxLength={LIMITS.reflectionMax}
          error={errors.reflection?.message}
          {...register('reflection')}
        />
        {acknowledgement ? (
          <p className="bg-panel px-4 py-3 text-[12px] leading-5 text-muted">
            This item needs an acknowledgement only. You can still attach a file if you have one.
          </p>
        ) : null}
        <FileDrop
          title={
            completion?.evidence
              ? 'Attach a new certificate or screenshot'
              : 'Attach certificate or screenshot'
          }
          hint={
            completion?.evidence
              ? `Current: ${completion.evidence.fileName}. PNG, JPG, PDF or WEBP - up to 15 MB`
              : 'PNG, JPG, PDF or WEBP - up to 15 MB'
          }
          accept={ACCEPT}
          capture
          onFile={(f) => setValue('file', f, { shouldValidate: true })}
          fileName={file?.name}
          fileNote={file ? formatBytes(file.size) : null}
          disabled={submit.isPending}
        />
        {errors.file ? (
          <p role="alert" className="text-[12px] text-pa-red">
            {errors.file.message}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
