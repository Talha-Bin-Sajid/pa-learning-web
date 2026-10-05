import { useMemo, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { ImportWizard } from '@/components/shared/ImportWizard';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { errorMessage } from '@/lib/api-client';
import { C, ROLE_LABEL } from '@/lib/palette';
import type { PersonAdmin, ReportingAccess, UserImportSummary, UserRole } from '@/types/api';
import { useMe } from '../auth/AuthProvider';
import { useLookups } from '../learning-items/api';
import { defaultAccess, type PersonDraft } from './access';
import {
  downloadUserTemplate,
  useBulkUpdatePeople,
  useCommitUserImport,
  usePreviewUserImport,
  useUsers,
} from './api';
import { UserDialog } from './UserDialog';

const cellSelect = 'pa-input !w-auto min-w-[150px] !py-[7px] !px-2.5 !text-[12px]';

export default function UsersPage() {
  const users = useUsers();
  const lookups = useLookups();
  const bulk = useBulkUpdatePeople();
  const preview = usePreviewUserImport();
  const commit = useCommitUserImport();
  const toast = useToast();
  const me = useMe();
  const [drafts, setDrafts] = useState<Record<string, PersonDraft>>({});
  const [editing, setEditing] = useState<PersonAdmin | null | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');

  const people = users.data ?? [];
  const dirty = Object.keys(drafts).length;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(
      (p) => !q || p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
    );
  }, [people, search]);

  /** Effective values = saved values overlaid with unsaved edits. */
  const view = (p: PersonAdmin) => {
    const d = drafts[p.id] ?? {};
    const role = d.role ?? p.role;
    const designationId = d.designationId !== undefined ? d.designationId : (p.designation?.id ?? null);
    const roleOrDesgChanged = d.role !== undefined || d.designationId !== undefined;
    const access: ReportingAccess =
      d.reportingAccess ??
      (roleOrDesgChanged ? defaultAccess(role, designationId, lookups.data) : p.reportingAccess);
    return {
      role,
      designationId,
      lineManagerId: d.lineManagerId !== undefined ? d.lineManagerId : (p.lineManager?.id ?? null),
      access,
    };
  };

  const edit = (p: PersonAdmin, change: PersonDraft) =>
    setDrafts((all) => {
      const next = { ...(all[p.id] ?? {}), ...change };
      // Changing role/designation resets access to the default unless picked explicitly afterwards.
      if (change.role !== undefined || change.designationId !== undefined) delete next.reportingAccess;
      const unchanged =
        (next.role === undefined || next.role === p.role) &&
        (next.designationId === undefined || next.designationId === (p.designation?.id ?? null)) &&
        (next.lineManagerId === undefined || next.lineManagerId === (p.lineManager?.id ?? null)) &&
        (next.reportingAccess === undefined || next.reportingAccess === p.reportingAccess);
      const copy = { ...all };
      if (unchanged) delete copy[p.id];
      else copy[p.id] = next;
      return copy;
    });

  const saveAll = async () => {
    try {
      await bulk.mutateAsync(Object.entries(drafts).map(([id, d]) => ({ id, ...d })));
      toast(`Settings saved for ${dirty} ${dirty === 1 ? 'person' : 'people'}.`);
      setDrafts({});
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const designationOptions = lookups.data?.designations ?? [];
  const columns: Column<PersonAdmin>[] = [
    {
      key: 'member',
      header: 'Member',
      primary: true,
      render: (p) => (
        <span className="inline-flex items-center gap-2.5">
          <Avatar initials={p.initials} color={p.avatarColor} size={32} />
          <span>
            <span className="block font-medium text-ink">
              {p.fullName}
              {p.status !== 'active' ? (
                <span className="ml-2 text-[10px] uppercase tracking-[1px] text-pa-red">{p.status}</span>
              ) : null}
            </span>
            <span className="block text-[11px] text-faint">
              {p.email}
              {!p.hasAccount ? ' · not signed in yet' : ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (p) => (
        <select
          aria-label={`Role for ${p.fullName}`}
          className={cellSelect}
          value={view(p).role}
          disabled={p.id === me.profile.id}
          onChange={(e) => edit(p, { role: e.target.value as UserRole })}
        >
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (p) => (
        <select
          aria-label={`Designation for ${p.fullName}`}
          className={cellSelect}
          value={view(p).designationId ?? ''}
          onChange={(e) => edit(p, { designationId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">- None -</option>
          {designationOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'manager',
      header: 'Line manager',
      render: (p) => (
        <select
          aria-label={`Line manager for ${p.fullName}`}
          className={cellSelect}
          value={view(p).lineManagerId ?? ''}
          onChange={(e) => edit(p, { lineManagerId: e.target.value || null })}
        >
          <option value="">- None -</option>
          {people
            .filter((x) => x.id !== p.id && x.status === 'active')
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.fullName}
              </option>
            ))}
        </select>
      ),
    },
    {
      key: 'access',
      header: 'Reporting access',
      render: (p) => {
        const a = view(p).access;
        return (
          <div>
            <select
              aria-label={`Reporting access for ${p.fullName}`}
              className={cellSelect}
              value={a}
              onChange={(e) => edit(p, { reportingAccess: e.target.value as ReportingAccess })}
            >
              <option value="full">Full reporting - all staff</option>
              <option value="self">Own learning reports only</option>
            </select>
            <div
              className="mt-1 text-[10px] uppercase tracking-[1.1px]"
              style={{ color: a === 'full' ? C.purple : 'rgba(38,39,25,.45)' }}
            >
              {a === 'full'
                ? 'Sees all staff reports'
                : p.reportCount
                  ? `Sees own team (${p.reportCount})`
                  : 'Own reports only'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'edit',
      header: '',
      hideOnMobile: true,
      render: (p) => (
        <Button size="sm" onClick={() => setEditing(p)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Page title="User Management" subtitle="Members, roles, designations, line managers and reporting access">
      {users.isPending ? <PageSkeleton stats={0} panels={1} /> : null}
      {users.error ? <ErrorState error={users.error} onRetry={() => void users.refetch()} /> : null}
      {users.data ? (
        <Panel padded={false} className="animate-fade-up">
          <div className="px-5 py-[22px] sm:px-6">
            <PanelHeader
              title="Team members"
              subtitle={`${people.length} people - roles and designations drive assignment; line managers drive team visibility`}
              actions={
                <>
                  {dirty ? (
                    <>
                      <span className="bg-danger-tint px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[1.1px] text-pa-red">
                        {dirty} unsaved {dirty === 1 ? 'change' : 'changes'}
                      </span>
                      <Button
                        onClick={() => {
                          setDrafts({});
                          toast('Changes discarded.');
                        }}
                      >
                        Discard
                      </Button>
                    </>
                  ) : null}
                  <Button onClick={() => setImporting(true)}>Upload user list</Button>
                  <Button onClick={() => setEditing(null)} disabled={!lookups.data}>
                    Add user
                  </Button>
                  <Button
                    variant="success"
                    disabled={!dirty}
                    loading={bulk.isPending}
                    onClick={() => void saveAll()}
                  >
                    Save settings
                  </Button>
                </>
              }
            />
            <input
              type="search"
              aria-label="Search people"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pa-input mt-4 !w-[280px] max-w-full !py-2"
            />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(p) => p.id}
            empty="No one matches your search."
            mobileActions={(p) => (
              <Button size="sm" onClick={() => setEditing(p)}>
                Edit
              </Button>
            )}
          />
        </Panel>
      ) : null}

      {lookups.data ? (
        <UserDialog
          open={editing !== undefined}
          person={editing ?? null}
          people={people}
          lookups={lookups.data}
          onClose={() => setEditing(undefined)}
        />
      ) : null}

      <ImportWizard<UserImportSummary>
        open={importing}
        onClose={() => setImporting(false)}
        title="Upload user list"
        intro="One person per row. Existing people are matched on email and updated rather than duplicated. Line managers can refer to other rows in the same file."
        columns={[
          { name: 'name', required: true, example: 'Ibraaheem Moolla' },
          {
            name: 'email',
            required: true,
            example: 'imoolla@projectaccountants.co.uk - the sign-in address',
          },
          { name: 'role', required: false, example: 'Learning Team / HR Team / Manager / Team Member' },
          { name: 'designation', required: false, example: 'Senior Accountant, Director…' },
          { name: 'access', required: false, example: 'full / self - blank follows role and designation' },
          { name: 'line_manager_email', required: false, example: 'dokoro@projectaccountants.co.uk' },
        ]}
        downloadTemplate={downloadUserTemplate}
        preview={(f) => preview.mutateAsync(f)}
        commit={async (rows) => {
          const r = await commit.mutateAsync(rows);
          return `${r.added} people added, ${r.updated} updated.`;
        }}
        renderRow={(s) => ({
          primary: s.fullName,
          secondary: `${s.email} · ${s.role} · ${s.designation ?? 'no designation'}${s.lineManagerEmail ? ` · reports to ${s.lineManagerEmail}` : ''}`,
          tag: people.some((p) => p.email.toLowerCase() === s.email) ? 'UPDATE' : 'NEW',
          tagColor: people.some((p) => p.email.toLowerCase() === s.email) ? C.deep : C.green,
        })}
        commitLabel="Import users"
      />
    </Page>
  );
}
