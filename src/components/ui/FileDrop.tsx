import { useId, useState, type DragEvent } from 'react';
import { cn } from '@/lib/cn';

interface FileDropProps {
  title: string;
  hint: string;
  accept: string;
  onFile: (file: File) => void;
  fileName?: string | null;
  fileNote?: string | null;
  disabled?: boolean;
  /** Offer the phone camera on mobile (evidence photos). */
  capture?: boolean;
}

/** Dashed drop zone (click or drag a file), as in the prototype's upload dialogs. */
export function FileDrop({ title, hint, accept, onFile, fileName, fileNote, disabled, capture }: FileDropProps) {
  const id = useId();
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'block cursor-pointer border border-dashed px-6 py-7 text-center transition-colors',
          over ? 'border-pa-blue bg-track/60' : 'border-[rgba(0,0,0,.25)] hover:border-ink',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          {...(capture ? { capture: 'environment' as const } : {})}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
        <div className="text-[14px] font-semibold text-ink">{title}</div>
        <div className="mt-1 text-[12px] text-muted">{hint}</div>
      </label>
      {fileName ? (
        <div className="mt-3.5 flex justify-between gap-3 bg-panel px-4 py-3 text-[13px]">
          <span className="truncate font-medium">{fileName}</span>
          {fileNote ? <span className="shrink-0 text-muted">{fileNote}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
