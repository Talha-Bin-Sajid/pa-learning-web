import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ListRow } from '@/components/ui/bits';
import { Modal } from '@/components/ui/Modal';
import { downloadCsv } from '@/lib/csv';

export interface DrillRow {
  key: string;
  primary: string;
  secondary?: string;
  meta?: string;
  dot?: string;
}

export interface DrillData {
  title: string;
  subtitle: string;
  rows: DrillRow[];
  /** Optional richer export: header row + data rows. Defaults to the visible rows. */
  exportRows?: (string | number | null)[][];
}

const DrillContext = createContext<((d: DrillData) => void) | null>(null);

/**
 * "Click any number to see what's behind it" - the prototype's drill-down
 * dialog, with an Export selection button (CSV, opens in Excel).
 */
export function DrillDownProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DrillData | null>(null);
  const open = useCallback((d: DrillData) => setData(d), []);

  const exportCsv = () => {
    if (!data) return;
    const rows = data.exportRows ?? [
      ['Item', 'Detail', 'Value'],
      ...data.rows.map((r) => [r.primary, r.secondary ?? '', r.meta ?? '']),
    ];
    downloadCsv(
      `${
        data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'selection'
      }.csv`,
      rows,
    );
  };

  return (
    <DrillContext.Provider value={open}>
      {children}
      <Modal
        open={!!data}
        onClose={() => setData(null)}
        title={data?.title ?? ''}
        subtitle={data?.subtitle}
        width={640}
        footer={
          <>
            <Button variant="outline" size="lg" onClick={exportCsv} disabled={!data?.rows.length}>
              Export selection
            </Button>
            <Button variant="dark" size="lg" onClick={() => setData(null)}>
              Close
            </Button>
          </>
        }
      >
        <div className="-my-2">
          {data?.rows.length ? (
            data.rows.map((r) => (
              <ListRow
                key={r.key}
                dot={r.dot}
                primary={r.primary}
                secondary={r.secondary}
                right={
                  r.meta ? (
                    <span className="whitespace-nowrap text-[12px] font-semibold text-body">{r.meta}</span>
                  ) : undefined
                }
              />
            ))
          ) : (
            <EmptyState className="py-6">Nothing in this selection.</EmptyState>
          )}
        </div>
      </Modal>
    </DrillContext.Provider>
  );
}

export function useDrillDown(): (d: DrillData) => void {
  const ctx = useContext(DrillContext);
  if (!ctx) throw new Error('useDrillDown must be used inside DrillDownProvider');
  return ctx;
}
