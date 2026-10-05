import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** The prototype's pill switch (52×28, green when on). Accessible as role="switch". */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-[52px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-pa-green' : 'bg-black/22',
      )}
    >
      <span
        aria-hidden
        className="absolute top-[3px] size-[22px] rounded-full bg-white shadow-sm transition-[left] duration-200"
        style={{ left: checked ? 27 : 3 }}
      />
    </button>
  );
}
