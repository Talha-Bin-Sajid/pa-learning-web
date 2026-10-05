import { C } from '@/lib/palette';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
  label: string;
  onClick?: () => void;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  radius?: number;
  stroke?: number;
  centerValue: string;
  centerLabel: string;
}

/** Clickable SVG donut (prototype: "Items by category", "My completion"). */
export function DonutChart({ segments, size = 170, radius = 64, stroke = 22, centerValue, centerLabel }: DonutChartProps) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const circ = 2 * Math.PI * radius;
  const c = size / 2;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerValue} ${centerLabel}`}>
        <circle cx={c} cy={c} r={radius} fill="none" stroke={C.track} strokeWidth={stroke} />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / total) * circ;
              const el = (
                <circle
                  key={s.key}
                  cx={c}
                  cy={c}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len.toFixed(2)} ${(circ - len).toFixed(2)}`}
                  strokeDashoffset={(-offset).toFixed(2)}
                  transform={`rotate(-90 ${c} ${c})`}
                  onClick={s.onClick}
                  className={s.onClick ? 'cursor-pointer transition-opacity hover:opacity-80' : undefined}
                >
                  <title>{`${s.label}: ${s.value}`}</title>
                </circle>
              );
              offset += len;
              return el;
            })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[28px] font-semibold leading-none text-ink">{centerValue}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[1.3px] text-faint">{centerLabel}</div>
      </div>
    </div>
  );
}

/** Legend rows that mirror the donut segments (also the keyboard-accessible way to drill in). */
export function DonutLegend({ segments, trailing }: { segments: DonutSegment[]; trailing?: (s: DonutSegment) => string }) {
  return (
    <ul className="flex min-w-0 flex-col gap-2">
      {segments.map((s) => (
        <li key={s.key}>
          <button type="button" onClick={s.onClick} className="flex w-full cursor-pointer items-center gap-2.5 text-left text-[12px] hover:text-ink">
            <span className="size-[11px] shrink-0" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="font-semibold">{trailing ? trailing(s) : s.value}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
