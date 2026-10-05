import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Rendered as the card title on phones (one column should set this). */
  primary?: boolean;
  /** Hide on phone cards (e.g. action buttons rendered separately). */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  /** Actions shown at the bottom of each phone card. */
  mobileActions?: (row: T) => ReactNode;
}

/**
 * The prototype's table (panel-grey header, hairline rows) on tablet/desktop;
 * becomes a stack of label/value cards on phones - no horizontal scrolling.
 */
export function DataTable<T>({ columns, rows, rowKey, empty, mobileActions }: DataTableProps<T>) {
  if (rows.length === 0)
    return <div className="px-6 py-10 text-center text-[13px] text-faint">{empty ?? 'Nothing to show.'}</div>;

  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="whitespace-nowrap bg-panel px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[1.3px] text-faint"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-panel/50">
                {columns.map((c) => (
                  <td key={c.key} className={cn('border-b border-line px-4 py-3 align-middle', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-5 py-4">
            <div className="mb-2">{primary.render(row)}</div>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[12px]">
              {columns
                .filter((c) => c !== primary && !c.hideOnMobile && c.header)
                .map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="pt-0.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-faint">
                      {c.header}
                    </dt>
                    <dd className="min-w-0">{c.render(row)}</dd>
                  </div>
                ))}
            </dl>
            {mobileActions ? <div className="mt-3 flex flex-wrap gap-2">{mobileActions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
