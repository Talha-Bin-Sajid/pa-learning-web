import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { FileDrop } from '@/components/ui/FileDrop';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { ApiError, errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { C } from '@/lib/palette';
import type { ImportPreview } from '@/types/api';
import { useToast } from './Toast';

export interface ImportColumn {
  name: string;
  required: boolean;
  example: string;
}

interface ImportWizardProps<S> {
  open: boolean;
  onClose: () => void;
  title: string;
  intro: string;
  columns: ImportColumn[];
  downloadTemplate: () => Promise<void>;
  preview: (file: File) => Promise<ImportPreview<S>>;
  commit: (rows: { rowNumber: number; values: Record<string, string> }[]) => Promise<string>;
  renderRow: (summary: S) => { primary: string; secondary: string; tag?: string; tagColor?: string };
  commitLabel: string;
}

type Step = 'template' | 'upload' | 'review';

/**
 * Template → Upload → Review, as in the prototype's bulk upload. The server
 * parses and validates the file; rows with errors are shown and block import.
 */
export function ImportWizard<S>(props: ImportWizardProps<S>) {
  return props.open ? <WizardBody {...props} /> : null;
}

function WizardBody<S>({
  onClose,
  title,
  intro,
  columns,
  downloadTemplate,
  preview,
  commit,
  renderRow,
  commitLabel,
}: ImportWizardProps<S>) {
  const toast = useToast();
  const [step, setStep] = useState<Step>('template');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPreview<S> | null>(null);
  const [busy, setBusy] = useState<'template' | 'preview' | 'commit' | null>(null);
  const [problem, setProblem] = useState<ReactNode>(null);

  const run = async <T,>(kind: NonNullable<typeof busy>, fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(kind);
    setProblem(null);
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ApiError && err.details.length) {
        setProblem(
          <>
            <div className="font-semibold">{err.message}</div>
            <ul className="mt-1 list-disc pl-5">
              {err.details.slice(0, 8).map((d) => (
                <li key={d.path + d.message}>
                  {d.path}: {d.message}
                </li>
              ))}
            </ul>
          </>,
        );
      } else setProblem(errorMessage(err));
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (f: File) => {
    setFile(f);
    const r = await run('preview', () => preview(f));
    if (r) {
      setResult(r);
      if (r.rows.length) setStep('review');
      else setProblem('No rows were found in that file. Check the first sheet and the column headers.');
    }
  };

  const doCommit = async () => {
    if (!result) return;
    const message = await run('commit', () =>
      commit(result.rows.map(({ rowNumber, values }) => ({ rowNumber, values }))),
    );
    if (message) {
      toast(message);
      onClose();
    }
  };

  const footer =
    step === 'template' ? (
      <>
        <Button size="lg" variant="dark" loading={busy === 'template'} onClick={() => void run('template', downloadTemplate)}>
          Download Excel template
        </Button>
        <Button size="lg" variant="primary" onClick={() => setStep('upload')}>
          Next: upload
        </Button>
      </>
    ) : step === 'upload' ? (
      <>
        <Button size="lg" onClick={() => setStep('template')}>
          Back
        </Button>
        <Button size="lg" variant="primary" disabled={!result} onClick={() => setStep('review')}>
          Next: review
        </Button>
      </>
    ) : (
      <>
        <Button size="lg" onClick={() => setStep('upload')}>
          Back
        </Button>
        <Button
          size="lg"
          variant="success"
          disabled={!result || result.errorCount > 0 || result.validCount === 0}
          loading={busy === 'commit'}
          onClick={() => void doCommit()}
        >
          {commitLabel}
        </Button>
      </>
    );

  return (
    <Modal open onClose={onClose} busy={busy === 'commit'} title={title} subtitle={intro} width={820} footer={footer}>
      <Tabs<Step>
        size="sm"
        className="mb-5"
        value={step}
        onChange={setStep}
        tabs={[
          { id: 'template', label: '1 - Template' },
          { id: 'upload', label: '2 - Upload' },
          { id: 'review', label: '3 - Review', disabled: !result },
        ]}
      />

      {step === 'template' ? (
        <div className="border border-line">
          <div className="grid grid-cols-[110px_80px_1fr] gap-3 bg-panel px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[1.3px] text-faint sm:grid-cols-[160px_110px_1fr]">
            <div>Column</div>
            <div>Needed</div>
            <div>Accepted values</div>
          </div>
          {columns.map((c) => (
            <div
              key={c.name}
              className="grid grid-cols-[110px_80px_1fr] gap-3 border-t border-line px-3.5 py-2.5 text-[12px] sm:grid-cols-[160px_110px_1fr]"
            >
              <div className="font-mono text-[12px] font-medium text-pa-blue-dark">{c.name}</div>
              <div className="font-medium" style={{ color: c.required ? C.red : 'rgba(38,39,25,.5)' }}>
                {c.required ? 'Required' : 'Optional'}
              </div>
              <div className="text-[rgba(38,39,25,.65)]">{c.example}</div>
            </div>
          ))}
        </div>
      ) : null}

      {step === 'upload' ? (
        <FileDrop
          title="Choose an Excel workbook"
          hint=".xlsx or .csv - the first sheet is read; headers must match the template"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onFile={(f) => void onFile(f)}
          fileName={file?.name}
          fileNote={busy === 'preview' ? 'Reading…' : result ? `${result.validCount} valid rows` : null}
          disabled={busy === 'preview'}
        />
      ) : null}

      {step === 'review' && result ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="bg-[#e7f7ee] px-2.5 py-1 font-semibold text-pa-green">{result.validCount} ready</span>
            {result.errorCount ? (
              <span className="bg-danger-tint px-2.5 py-1 font-semibold text-pa-red">
                {result.errorCount} with problems - fix them in the file and upload again
              </span>
            ) : null}
          </div>
          <div className="border border-line">
            {result.rows.map((r) => {
              const view = r.summary ? renderRow(r.summary) : null;
              const bad = r.errors.length > 0;
              return (
                <div
                  key={r.rowNumber}
                  className={cn('flex items-start gap-3.5 border-b border-line px-3.5 py-[11px] text-[13px] last:border-b-0', bad && 'bg-danger-tint/60')}
                  style={{ borderLeft: `3px solid ${bad ? C.red : C.green}` }}
                >
                  <div className="w-[44px] shrink-0 pt-0.5 text-[11px] text-subtle">Row {r.rowNumber}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{view?.primary ?? (r.values.name || r.values.email || '(no name)')}</div>
                    {bad ? (
                      <div className="mt-0.5 text-[11px] text-pa-red">{r.errors.join(' · ')}</div>
                    ) : (
                      <div className="mt-0.5 text-[11px] text-muted">{view?.secondary}</div>
                    )}
                  </div>
                  {view?.tag && !bad ? (
                    <div className="whitespace-nowrap bg-track px-[9px] py-[3px] text-[11px]" style={{ color: view.tagColor ?? C.deep }}>
                      {view.tag}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {problem ? (
        <div role="alert" className="mt-4 border-l-[3px] border-pa-red bg-danger-tint px-4 py-3 text-[12px] leading-5 text-pa-red">
          {problem}
        </div>
      ) : null}
    </Modal>
  );
}
