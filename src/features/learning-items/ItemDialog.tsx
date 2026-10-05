import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/bits';
import { ApiError, errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { applyServerErrors, LIMITS } from '@/lib/forms';
import type { LearningItem, Lookups, PersonAdmin } from '@/types/api';
import { useSaveItem } from './api';
import { DETAIL_FIELDS, itemDefaults, itemSchema, toItemInput, type ItemFormValues } from './item.schema';

type Step = 'details' | 'assignment';
type AudienceField = 'all' | 'designationIds' | 'profileIds';

interface ItemDialogProps {
  open: boolean;
  item: LearningItem | null;
  lookups: Lookups;
  people: PersonAdmin[];
  onClose: () => void;
}

export function ItemDialog(props: ItemDialogProps) {
  return props.open ? <ItemDialogBody key={props.item?.id ?? 'new'} {...props} /> : null;
}

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-[12px] font-medium transition-colors disabled:cursor-not-allowed',
        on ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-body hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}

const options = (list: { id: number; name: string }[]) => list.map((x) => ({ value: String(x.id), label: x.name }));

function ItemDialogBody({ item, lookups, people, onClose }: ItemDialogProps) {
  const toast = useToast();
  const saveItem = useSaveItem();
  const [step, setStep] = useState<Step>('details');
  const [search, setSearch] = useState('');
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: itemDefaults(item, lookups),
    mode: 'onTouched',
  });
  const [all, designationIds, profileIds] = watch(['all', 'designationIds', 'profileIds']);

  const activePeople = useMemo(() => people.filter((p) => p.status === 'active'), [people]);
  const visiblePeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activePeople.filter((p) => !q || p.fullName.toLowerCase().includes(q));
  }, [activePeople, search]);

  const summary = all
    ? 'Everyone - all staff'
    : [
        ...lookups.designations.filter((x) => designationIds.includes(x.id)).map((x) => x.name),
        ...activePeople.filter((p) => profileIds.includes(p.id)).map((p) => p.fullName),
      ].join(' · ') || 'Nobody selected yet';

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** Audience chips aren't inputs, so they update the form through setValue. */
  const setAudience = (patch: Partial<Pick<ItemFormValues, AudienceField>>) => {
    (Object.keys(patch) as AudienceField[]).forEach((k) => setValue(k, patch[k] as never, { shouldDirty: true }));
    if (errors.designationIds) void trigger('designationIds');
  };

  const save = handleSubmit(
    async (values) => {
      try {
        await saveItem.mutateAsync({ id: item?.id, input: toItemInput(values) });
        toast(item ? 'Item updated.' : 'Item added to the template.');
        onClose();
      } catch (err) {
        applyServerErrors(err, setError, [...DETAIL_FIELDS, 'designationIds'], { audience: 'designationIds' });
        if (err instanceof ApiError && err.details.some((d) => (DETAIL_FIELDS as readonly string[]).includes(d.path))) {
          setStep('details');
        }
        toast(errorMessage(err), 'error');
      }
    },
    // Invalid: jump back to the step that holds the problem.
    (errs) => {
      if (DETAIL_FIELDS.some((f) => errs[f])) setStep('details');
    },
  );

  const next = async () => {
    if (step === 'details') {
      if (await trigger([...DETAIL_FIELDS])) setStep('assignment');
      return;
    }
    await save();
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={saveItem.isPending}
      width={840}
      title={item ? 'Edit learning item' : 'Add learning item'}
      footer={
        <>
          <Button size="lg" onClick={onClose} disabled={saveItem.isPending}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => void next()} loading={saveItem.isPending}>
            {step === 'details' ? 'Next: assignment' : 'Save item'}
          </Button>
        </>
      }
    >
      <Tabs<Step>
        size="sm"
        className="mb-[22px]"
        value={step}
        onChange={setStep}
        tabs={[
          { id: 'details', label: '1 - Details' },
          { id: 'assignment', label: '2 - Assignment' },
        ]}
      />

      {step === 'details' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label="Activity title"
            placeholder="GDPR and Data Handling"
            maxLength={LIMITS.titleMax}
            error={errors.title?.message}
            {...register('title')}
          />
          <SelectField label="Category" options={options(lookups.categories)} error={errors.categoryId?.message} {...register('categoryId')} />
          <SelectField label="CPD type" options={options(lookups.cpdTypes)} error={errors.cpdTypeId?.message} {...register('cpdTypeId')} />
          <SelectField
            label="Training type"
            options={options(lookups.deliveryTypes)}
            error={errors.deliveryTypeId?.message}
            {...register('deliveryTypeId')}
          />
          <TextField label="Provider" placeholder="ICAEW" maxLength={LIMITS.providerMax} error={errors.provider?.message} {...register('provider')} />
          <TextField
            label="Hours"
            type="number"
            step="0.25"
            min="0.25"
            placeholder="2.5"
            error={errors.hours?.message}
            {...register('hours')}
          />
          <TextField label="Due date" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
          <SelectField
            label="Mandatory"
            options={[
              { value: 'yes', label: 'Yes - mandatory' },
              { value: 'no', label: 'Optional' },
            ]}
            {...register('isMandatory')}
          />
          <SelectField
            label="Evidence"
            options={[
              { value: 'certificate', label: 'Certificate upload' },
              { value: 'acknowledgement', label: 'Acknowledgement only' },
            ]}
            {...register('evidenceMode')}
          />
          <TextField className="sm:col-span-2" label="Learning link" placeholder="https://" error={errors.link?.message} {...register('link')} />
          <TextArea
            className="sm:col-span-2"
            label="Description"
            placeholder="What should participants take away?"
            maxLength={LIMITS.descriptionMax}
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
      ) : (
        <div>
          <div className="mb-3.5 bg-panel px-[18px] py-4">
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[1.3px] text-faint">Everyone</div>
            <Chip on={all} onClick={() => setAudience({ all: !all, designationIds: [], profileIds: [] })}>
              All staff
            </Chip>
          </div>
          <fieldset disabled={all} className={cn('mb-3.5 bg-panel px-[18px] py-4 transition-opacity', all && 'opacity-40')}>
            <legend className="sr-only">By designation</legend>
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[1.3px] text-faint">By designation</div>
            <div className="flex flex-wrap gap-2">
              {lookups.designations.map((x) => (
                <Chip
                  key={x.id}
                  disabled={all}
                  on={!all && designationIds.includes(x.id)}
                  onClick={() => setAudience({ designationIds: toggle(designationIds, x.id) })}
                >
                  {x.name}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={all} className={cn('bg-panel px-[18px] py-4 transition-opacity', all && 'opacity-40')}>
            <legend className="sr-only">By individual</legend>
            <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[1.3px] text-faint">By individual</div>
            <input
              type="search"
              aria-label="Search people"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pa-input mb-3 !w-[280px] max-w-full"
            />
            <div className="flex max-h-[180px] flex-wrap gap-2 overflow-y-auto">
              {visiblePeople.map((p) => (
                <Chip
                  key={p.id}
                  disabled={all}
                  on={!all && profileIds.includes(p.id)}
                  onClick={() => setAudience({ profileIds: toggle(profileIds, p.id) })}
                >
                  <Avatar initials={p.initials} color={p.avatarColor} size={20} />
                  {p.fullName}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="mt-3.5 text-[13px] text-[rgba(38,39,25,.65)]">
            <strong className="text-ink">Assigned to:</strong> {summary}
          </div>
          {errors.designationIds ? (
            <p role="alert" className="mt-2 text-[12px] text-pa-red">
              {errors.designationIds.message}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
