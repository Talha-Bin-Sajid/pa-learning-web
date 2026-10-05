import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { C } from '@/lib/palette';

/** Circular initials avatar in the person's colour. */
export function Avatar({ initials, color, size = 32, className }: { initials: string; color?: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: color ?? C.teal, fontSize: Math.max(9, Math.round(size * 0.34)) }}
    >
      {initials}
    </span>
  );
}

/** 8px square status marker. */
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn('mt-1.5 inline-block size-2 shrink-0', className)} style={{ background: color }} />;
}

/** Light-blue pill (training type, assign-to). */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-block whitespace-nowrap bg-track px-[9px] py-[3px] text-[11px] font-medium text-pa-blue-dark', className)}>{children}</span>;
}

/** Uppercase tracked status word (MANDATORY, OVERDUE…). */
export function StatusText({ children, color, className }: { children: ReactNode; color: string; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap text-[11px] font-semibold uppercase tracking-[1.1px]', className)} style={{ color }}>
      {children}
    </span>
  );
}

/** Solid chip used in the header (year, role). */
export function Chip({ children, background, color = '#fff', className }: { children: ReactNode; background: string; color?: string; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap px-3 py-[7px] text-[11px] font-semibold uppercase tracking-[1.3px]', className)} style={{ background, color }}>
      {children}
    </span>
  );
}

/** Horizontal progress bar with an entrance fill animation. */
export function ProgressBar({ pct, color, height = 10, label }: { pct: number; color: string; height?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="w-full bg-track"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full origin-left animate-bar transition-[width] duration-300" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

/** Row in a list: square dot, primary + secondary text, optional right slot. */
export function ListRow({
  dot,
  primary,
  secondary,
  secondaryColor,
  right,
  onClick,
}: {
  dot?: string;
  primary: ReactNode;
  secondary?: ReactNode;
  secondaryColor?: string;
  right?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      {dot ? <Dot color={dot} /> : null}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-body">{primary}</div>
        {secondary ? (
          <div className="mt-0.5 text-[11px]" style={{ color: secondaryColor ?? 'rgba(38,39,25,.55)' }}>
            {secondary}
          </div>
        ) : null}
      </div>
      {right}
    </>
  );
  const cls = 'flex w-full items-start gap-3 border-b border-line py-[11px] text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'cursor-pointer transition-colors hover:bg-panel/60')}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function EmptyState({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'success'; className?: string }) {
  return <div className={cn('text-[13px]', tone === 'success' ? 'text-pa-green' : 'text-faint', className)}>{children}</div>;
}

/** Hidden-on-screen text for assistive tech. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
