import { useState } from 'react';
import { Page } from '@/components/layout/Page';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { errorMessage } from '@/lib/api-client';
import { C } from '@/lib/palette';
import { downloadItemTemplate } from './api';
import { ItemImportWizard } from './ItemImportWizard';

const GUIDE = [
  { k: 'all', v: 'Assigned to every team member' },
  { k: 'Accountant', v: 'Everyone holding that designation' },
  { k: 'Accountant; Manager', v: 'Several designations (separate with ;)' },
  { k: 'name@email', v: 'One named individual' },
  { k: '(blank)', v: 'Falls back to all staff' },
];

export default function BulkUploadPage() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadItemTemplate();
      toast('Excel template downloaded.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Page title="Bulk Upload" subtitle="Import learning items from Excel">
      <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel accent={C.blue}>
          <PanelHeader title="Import from Excel" />
          <p className="mb-[18px] mt-2.5 text-[13px] leading-[22px] text-[rgba(38,39,25,.65)]">
            The template is a formatted .xlsx workbook - a Learning Items sheet with frozen headers and
            filters, plus Guidance and Designations sheets. Fill one item per row and upload it back. Every
            row is checked before anything is imported.
          </p>
          <div className="flex flex-col gap-2.5">
            <Button variant="dark" size="lg" loading={downloading} onClick={() => void download()}>
              Download Excel template
            </Button>
            <Button variant="primary" size="lg" onClick={() => setOpen(true)}>
              Upload completed workbook
            </Button>
          </div>
        </Panel>
        <Panel accent={C.cyan}>
          <PanelHeader title="The assign_to column" className="mb-4" />
          {GUIDE.map((g) => (
            <div key={g.k} className="flex gap-4 border-b border-line py-2.5 text-[13px]">
              <div className="w-[150px] shrink-0 font-medium text-pa-blue-dark">{g.k}</div>
              <div className="text-[rgba(38,39,25,.7)]">{g.v}</div>
            </div>
          ))}
        </Panel>
      </div>
      <ItemImportWizard open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}
