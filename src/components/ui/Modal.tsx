import { Dialog, Slide, useMediaQuery } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import { C } from '@/lib/palette';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** One line under the title (context, counts, dates). */
  subtitle?: ReactNode;
  /** Pixel width on desktop (prototype uses 520 / 820 / 840). */
  width?: number;
  children: ReactNode;
  /** Action buttons, right-aligned in the footer bar. */
  footer?: ReactNode;
  /** Colour of the 3px top edge (stat-card style). Defaults to brand blue. */
  accent?: string;
  /** Prevent closing (backdrop, Escape, ×) while saving. */
  busy?: boolean;
  /** Short dialogs (confirmations): stay a centred card on phones instead of going full screen. */
  compact?: boolean;
}

/** Gentle upward entrance, like the page sections. */
const SlideUp = forwardRef(function SlideUp(props: TransitionProps & { children: ReactElement }, ref: Ref<unknown>) {
  return <Slide direction="up" ref={ref} {...props} timeout={{ enter: 220, exit: 160 }} />;
});

/**
 * MUI Dialog (focus trap, Escape, scroll lock, aria) styled as the prototype's
 * square white sheet: header · scrollable body · footer bar. Full-screen on phones.
 */
export function Modal({ open, onClose, title, subtitle, width = 520, children, footer, accent = C.blue, busy, compact }: ModalProps) {
  const phone = useMediaQuery('(max-width:599px)');
  const full = phone && !compact;
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullScreen={full}
      maxWidth={false}
      scroll="paper"
      aria-labelledby="modal-title"
      slots={full ? { transition: SlideUp } : undefined}
      slotProps={{
        paper: {
          sx: {
            width: full ? '100%' : phone ? 'calc(100% - 32px)' : width,
            maxWidth: '100%',
            maxHeight: full ? '100%' : 'calc(100% - 64px)',
            m: full ? 0 : phone ? 2 : 4,
            borderRadius: 0,
            borderTop: `3px solid ${accent}`,
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)' } },
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 pb-[18px] pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <h2 id="modal-title" className="text-[19px] font-semibold leading-tight tracking-[-0.2px] text-ink">
            {title}
          </h2>
          {subtitle ? <p className="mt-1.5 text-[13px] leading-5 text-muted">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center border border-transparent text-faint transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>

      {footer ? (
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-line bg-panel px-5 py-4 sm:px-7">
          {footer}
        </footer>
      ) : null}
    </Dialog>
  );
}
