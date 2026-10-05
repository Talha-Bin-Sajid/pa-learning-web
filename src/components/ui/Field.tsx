import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/**
 * Label + control + error/hint, with ids wired for screen readers.
 * Controls accept `ref` (React 19), so they work directly with react-hook-form's `register()`.
 */
export function FieldShell({ label, error, hint, className, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[1.3px] text-faint">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[11px] text-pa-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Base = { label: string; error?: string; hint?: ReactNode; className?: string };

export function TextField({ label, error, hint, className, ...input }: Base & ComponentPropsWithRef<'input'>) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className="pa-input" {...input} />}
    </FieldShell>
  );
}

export function TextArea({ label, error, hint, className, ...input }: Base & ComponentPropsWithRef<'textarea'>) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <textarea id={id} aria-invalid={!!error} aria-describedby={describedBy} className={cn('pa-input min-h-[74px] resize-y')} {...input} />
      )}
    </FieldShell>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField({ label, error, hint, className, options, ...select }: Base & ComponentPropsWithRef<'select'> & { options: Option[] }) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <select id={id} aria-invalid={!!error} aria-describedby={describedBy} className="pa-input" {...select}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
