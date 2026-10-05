import { useState } from 'react';
import { Page } from '@/components/layout/Page';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatCard, StatGrid } from '@/components/ui/StatCard';
import { StatusText, Tag } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { errorMessage } from '@/lib/api-client';
import { formatDate, formatHours } from '@/lib/format';
import { C } from '@/lib/palette';
import type { LearningItem } from '@/types/api';
import { useUsers } from '../users/api';
import { useArchiveItem, useItems, useLookups } from './api';
import { ItemDialog } from './ItemDialog';
import { ItemImportWizard } from './ItemImportWizard';

export default function TemplatePage() {
  const items = useItems();
  const lookups = useLookups();
  const people = useUsers();
  const archive = useArchiveItem();
  const toast = useToast();
  const [editing, setEditing] = useState<LearningItem | null | undefined>(undefined); // undefined = closed, null = new
  const [importing, setImporting] = useState(false);
  const [confirm, setConfirm] = useState<LearningItem | null>(null);

  const list = items.data ?? [];
  const totalHours = Math.round(list.reduce((a, i) => a + i.hours, 0) * 10) / 10;

  const doArchive = async () => {
    if (!confirm) return;
    try {
      await archive.mutateAsync(confirm.id);
      toast('Item removed from the template. Completed records are kept.');
      setConfirm(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const columns: Column<LearningItem>[] = [
    {
      key: 'activity',
      header: 'Activity',
      primary: true,
      className: 'min-w-[240px]',
      render: (i) => (
        <div>
          <div className="font-medium text-ink">{i.title}</div>
          <div className="mt-0.5 text-[11px] text-faint">{i.category.name}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (i) => <Tag>{i.deliveryType.name}</Tag> },
    { key: 'provider', header: 'Provider', render: (i) => i.provider, className: 'text-[rgba(38,39,25,.7)]' },
    { key: 'hours', header: 'Hours', render: (i) => formatHours(i.hours), className: 'whitespace-nowrap font-medium' },
    { key: 'due', header: 'Due', render: (i) => formatDate(i.dueDate), className: 'whitespace-nowrap text-[rgba(38,39,25,.7)]' },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <StatusText color={i.isMandatory ? C.red : 'rgba(38,39,25,.5)'}>{i.isMandatory ? 'Mandatory' : 'Optional'}</StatusText>,
    },
    { key: 'assigned', header: 'Assigned to', render: (i) => i.audience.label, className: 'max-w-[190px] text-[11px] text-[rgba(38,39,25,.7)]' },
    {
      key: 'actions',
      header: '',
      hideOnMobile: true,
      className: 'whitespace-nowrap',
      render: (i) => (
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => setEditing(i)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirm(i)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const actions = (
    <>
      <Button onClick={() => setImporting(true)}>Bulk upload</Button>
      <Button variant="primary" onClick={() => setEditing(null)} disabled={!lookups.data}>
        Add item
      </Button>
    </>
  );

  return (
    <Page title="Learning Template" subtitle="Required learning items and who they are assigned to" actions={actions}>
      {items.isPending ? <PageSkeleton panels={1} /> : null}
      {items.error ? <ErrorState error={items.error} onRetry={() => void items.refetch()} /> : null}
      {items.data ? (
        <div className="stagger space-y-5">
          <StatGrid>
            <StatCard label="Total items" value={list.length} color={C.purple} />
            <StatCard label="Mandatory" value={list.filter((i) => i.isMandatory).length} color={C.red} />
            <StatCard label="Optional" value={list.filter((i) => !i.isMandatory).length} color={C.blue} />
            <StatCard label="Total hours" value={totalHours} color={C.cyan} />
          </StatGrid>
          <Panel padded={false}>
            <div className="px-5 py-[22px] sm:px-6">
              <PanelHeader title="Required learning items" subtitle="Read-only for team members" />
            </div>
            <DataTable
              columns={columns}
              rows={list}
              rowKey={(i) => i.id}
              empty="No learning items yet. Add one or import a spreadsheet."
              mobileActions={(i) => (
                <>
                  <Button size="sm" onClick={() => setEditing(i)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirm(i)}>
                    Delete
                  </Button>
                </>
              )}
            />
          </Panel>
        </div>
      ) : null}

      {lookups.data ? (
        <ItemDialog open={editing !== undefined} item={editing ?? null} lookups={lookups.data} people={people.data ?? []} onClose={() => setEditing(undefined)} />
      ) : null}
      <ItemImportWizard open={importing} onClose={() => setImporting(false)} />

      <ConfirmDialog
        open={!!confirm}
        title={`Remove “${confirm?.title ?? ''}”?`}
        confirmLabel="Remove item"
        busy={archive.isPending}
        onConfirm={() => void doArchive()}
        onCancel={() => setConfirm(null)}
      >
        It will disappear from everyone’s learning plan. Evidence already submitted for it is kept in the records and reports.
      </ConfirmDialog>
    </Page>
  );
}
