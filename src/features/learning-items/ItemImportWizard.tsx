import { ImportWizard } from '@/components/shared/ImportWizard';
import { formatDate } from '@/lib/format';
import type { ItemImportSummary } from '@/types/api';
import { downloadItemTemplate, useCommitItemImport, usePreviewItemImport } from './api';

const COLUMNS = [
  { name: 'name', required: true, example: 'Anti-Money Laundering Refresh' },
  { name: 'hours', required: true, example: '1.5' },
  { name: 'category', required: false, example: 'Mandatory Compliance' },
  { name: 'cpd_type', required: false, example: 'Structured CPD' },
  { name: 'type', required: false, example: 'eLearning, Webinar, Workshop' },
  { name: 'provider', required: false, example: 'ICAEW' },
  { name: 'due_date', required: false, example: '2026-12-31 or 31/12/2026' },
  { name: 'mandatory', required: false, example: 'yes / no' },
  { name: 'evidence', required: false, example: 'certificate / acknowledgement' },
  { name: 'assign_to', required: false, example: 'all / Accountant; Manager / name@email' },
];

export function ItemImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const preview = usePreviewItemImport();
  const commit = useCommitItemImport();
  return (
    <ImportWizard<ItemImportSummary>
      open={open}
      onClose={onClose}
      title="Bulk upload learning items"
      intro="One item per row. Keep the column headers as supplied. The assign_to column accepts all, designation names or work emails - separate several with a semicolon."
      columns={COLUMNS}
      downloadTemplate={downloadItemTemplate}
      preview={(f) => preview.mutateAsync(f)}
      commit={async (rows) => {
        const r = await commit.mutateAsync(rows);
        return `${r.created} items imported.`;
      }}
      renderRow={(s) => ({
        primary: s.title,
        secondary: `${s.deliveryType} · ${s.provider} · ${s.hours} h · due ${formatDate(s.dueDate)}`,
        tag: s.assignTo,
      })}
      commitLabel="Import items"
    />
  );
}
