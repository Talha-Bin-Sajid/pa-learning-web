import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { C } from '@/lib/palette';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Explains the consequence in plain words. */
  children: ReactNode;
  confirmLabel: string;
  /** "danger" for destructive actions (red accent + outline), "primary" otherwise. */
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Consistent "Are you sure?" dialog, built on Modal. */
export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'danger', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const danger = tone === 'danger';
  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={busy}
      title={title}
      width={480}
      compact
      accent={danger ? C.red : C.blue}
      footer={
        <>
          <Button size="lg" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="lg" variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center"
          style={{ background: danger ? '#fdecea' : '#ecf4ff', color: danger ? C.red : C.blue }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {danger ? (
              <path d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5" strokeLinejoin="round" strokeLinecap="round" />
            ) : (
              <path d="M12 8v.5M12 11v6M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" strokeLinecap="round" />
            )}
          </svg>
        </span>
        <div className="pt-0.5 text-[13px] leading-[22px] text-[rgba(38,39,25,.75)]">{children}</div>
      </div>
    </Modal>
  );
}
