import { monthLabel } from '@/lib/format';
import { C } from '@/lib/palette';

interface MonthBarsProps {
  data: { month: string; count: number }[];
  onSelect?: (month: string) => void;
  height?: number;
}

/** Column chart of evidence filed per month (prototype dashboard). */
export function MonthBars({ data, onSelect, height = 190 }: MonthBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const inner = height - 52;
  return (
    <div className="flex items-end gap-1.5 sm:gap-2.5" style={{ height }}>
      {data.map((d, i) => (
        <button
          key={d.month}
          type="button"
          onClick={() => onSelect?.(d.month)}
          aria-label={`${monthLabel(d.month)}: ${d.count} completions`}
          className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
        >
          <span className="mb-1.5 text-[11px] font-semibold" style={{ color: d.count ? '#000' : 'transparent' }}>
            {d.count || '0'}
          </span>
          <span
            className="block w-full origin-bottom animate-[fadeup_.5s_both] transition-opacity hover:opacity-80"
            style={{ height: Math.round(6 + (d.count / max) * inner), background: d.count ? C.blue : C.track, animationDelay: `${i * 30}ms` }}
          />
          <span className="mt-2 w-full overflow-hidden text-center text-[10px] text-faint">{monthLabel(d.month)}</span>
        </button>
      ))}
    </div>
  );
}
