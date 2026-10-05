import { cn } from '@/lib/cn';

interface TabsProps<T extends string> {
  tabs: { id: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/** Underlined text tabs (sign in / request access, modal steps). */
export function Tabs<T extends string>({ tabs, value, onChange, className, size = 'md' }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex gap-6 border-b border-[rgba(0,0,0,.12)]', className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px cursor-pointer border-b-2 pb-2.5 font-semibold uppercase disabled:cursor-not-allowed',
              size === 'md' ? 'text-[13px] tracking-[.6px]' : 'text-[12px] tracking-[.8px]',
              active ? 'border-pa-blue text-ink' : 'border-transparent text-subtle hover:text-body',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
