import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  noteColor?: string;
  color: string;
  onClick?: () => void;
  /** Larger figure (44px) used on personal dashboards. */
  large?: boolean;
  children?: ReactNode;
}

/** KPI tile: uppercase label, big figure, note; 3px coloured top border. Clickable tiles lift on hover. */
export function StatCard({ label, value, note, noteColor, color, onClick, large, children }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'block w-full bg-white text-left shadow-card px-6 pt-[22px] pb-6',
        onClick && 'cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card-hover',
      )}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="micro-label">{label}</div>
      <div className={cn('mt-2.5 font-semibold leading-[1.1] text-ink', large ? 'text-[44px]' : 'text-[38px]')}>{value}</div>
      {note ? (
        <div className="mt-1 text-[12px]" style={{ color: noteColor ?? 'rgba(38,39,25,.55)' }}>
          {note}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5', className)}>{children}</div>;
}
