import { Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { C } from '@/lib/palette';

type Tone = 'info' | 'error';
interface ToastState {
  message: string;
  tone: Tone;
  key: number;
}

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

/**
 * Black, square toast in the prototype's style with a coloured edge + icon
 * (green ✓ for confirmations, red ! for errors). MUI Snackbar handles timing;
 * errors stay a little longer and are announced assertively.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, tone: Tone = 'info') => setToast({ message, tone, key: Date.now() }), []);
  const error = toast?.tone === 'error';
  const close = () => setToast(null);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={error ? 6000 : 3500}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <div
          role={error ? 'alert' : 'status'}
          className="flex min-w-[280px] max-w-[min(560px,calc(100vw-32px))] items-start gap-3 bg-ink py-3 pl-4 pr-2 text-white shadow-[var(--shadow-modal)]"
          style={{ borderLeft: `3px solid ${error ? C.red : C.green}` }}
        >
          <span
            aria-hidden
            className="mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
            style={{ background: error ? C.red : C.green }}
          >
            {error ? '!' : '✓'}
          </span>
          <span className="flex-1 pt-px text-[13px] leading-5">{toast?.message}</span>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss"
            className="grid size-6 shrink-0 cursor-pointer place-items-center text-white/50 transition-colors hover:text-white"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, tone?: Tone) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
