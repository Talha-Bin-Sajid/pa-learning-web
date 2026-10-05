import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ApiError, errorMessage } from '@/lib/api-client';
import { applyServerErrors, LIMITS } from '@/lib/forms';
import { ROLE_LABEL } from '@/lib/palette';
import type { Lookups, PersonAdmin, UserRole } from '@/types/api';
import { useMe } from '../auth/AuthProvider';
import { defaultAccess } from './access';
import { useSavePerson } from './api';
import { toPersonInput, userDefaults, userSchema, type UserFormValues } from './user.schema';

interface Props {
  open: boolean;
  person: PersonAdmin | null;
  people: PersonAdmin[];
  lookups: Lookups;
  onClose: () => void;
}

const FIELDS = ['fullName', 'email', 'role', 'designationId', 'lineManagerId', 'access', 'status'] as const;

export function UserDialog(props: Props) {
  return props.open ? <Body key={props.person?.id ?? 'new'} {...props} /> : null;
}

function Body({ person, people, lookups, onClose }: Props) {
  const toast = useToast();
  const save = useSavePerson();
  const me = useMe();
  const self = person?.id === me.profile.id;
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({ resolver: zodResolver(userSchema), defaultValues: userDefaults(person), mode: 'onTouched' });

  const [role, designationId] = watch(['role', 'designationId']);
  const auto = defaultAccess(role, designationId ? Number(designationId) : null, lookups);

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ id: person?.id, input: toPersonInput(v, !!person) });
      toast(person ? 'User updated.' : 'Person added. They can sign in by requesting access with this email.');
      onClose();
    } catch (err) {
      const mapped = applyServerErrors(err, setError, FIELDS, { reportingAccess: 'access' });
      if (!mapped && err instanceof ApiError && err.code === 'EMAIL_TAKEN') setError('email', { type: 'server', message: err.message });
      else if (!mapped && err instanceof ApiError && ['REPORTING_LOOP', 'INVALID_LINE_MANAGER'].includes(err.code)) {
        setError('lineManagerId', { type: 'server', message: err.message });
      } else if (!mapped) toast(errorMessage(err), 'error');
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      busy={save.isPending}
      title={person ? 'Edit team member' : 'Add team member'}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" loading={save.isPending} onClick={() => void submit()}>
            {person ? 'Save changes' : 'Add person'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Full name" maxLength={LIMITS.nameMax} error={errors.fullName?.message} {...register('fullName')} />
        <TextField
          className="sm:col-span-2"
          label="Email"
          type="email"
          hint="The sign-in address reminders go to"
          error={errors.email?.message}
          {...register('email')}
        />
        <SelectField
          label="Role"
          disabled={self}
          hint={self ? 'You cannot change your own role' : undefined}
          options={(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          error={errors.role?.message}
          {...register('role')}
        />
        <SelectField
          label="Designation"
          options={[{ value: '', label: '- None -' }, ...lookups.designations.map((d) => ({ value: String(d.id), label: d.name }))]}
          error={errors.designationId?.message}
          {...register('designationId')}
        />
        <SelectField
          label="Line manager"
          options={[
            { value: '', label: '- None -' },
            ...people.filter((p) => p.id !== person?.id && p.status === 'active').map((p) => ({ value: p.id, label: p.fullName })),
          ]}
          error={errors.lineManagerId?.message}
          {...register('lineManagerId')}
        />
        <SelectField
          label="Reporting access"
          hint="Learning Team, HR and Director-level designations default to full reporting."
          options={[
            { value: 'auto', label: `Default for role - ${auto === 'full' ? 'all staff' : 'own only'}` },
            { value: 'full', label: 'Full reporting - all staff' },
            { value: 'self', label: 'Own learning reports only' },
          ]}
          error={errors.access?.message}
          {...register('access')}
        />
        {person ? (
          <SelectField
            label="Status"
            disabled={self}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive - cannot sign in' },
            ]}
            {...register('status')}
          />
        ) : null}
      </div>
    </Modal>
  );
}
