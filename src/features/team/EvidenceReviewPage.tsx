import { useMemo, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { EvidenceCheckPanel } from '@/components/shared/EvidenceCheckPanel';
import { EvidenceViewer } from '@/components/shared/EvidenceViewer';
import { EVIDENCE_STATE, evidenceState, type EvidenceState } from '@/components/shared/evidence-status';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { TextArea } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar, StatusText } from '@/components/ui/bits';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { errorMessage } from '@/lib/api-client';
import { formatDate, formatHours } from '@/lib/format';
import { C } from '@/lib/palette';
import type { EvidenceRecord } from '@/types/api';
import { usePermissions } from '../auth/AuthProvider';
import { useCycle } from '../cycles/CycleProvider';
import { downloadTeamReport, useDecideEvidence, useEvidenceRegister, useRecheckEvidence } from './api';

type Filter = 'review' | 'checking' | 'verified' | 'rejected' | 'all';

const FILTERS: Record<Filter, { label: string; states: EvidenceState[] | null }> = {
  review: { label: 'Needs review', states: ['flagged', 'awaiting'] },
  checking: { label: 'Checking', states: ['checking'] },
  verified: { label: 'Verified', states: ['verified', 'approved'] },
  rejected: { label: 'Rejected', states: ['rejected'] },
  all: { label: 'All', states: null },
};

const REJECT_MAX = 1000;

export default function EvidenceReviewPage() {
  const { data, isPending, error, refetch } = useEvidenceRegister({});
  const { cycleId } = useCycle();
  const { decideEvidence: canDecide } = usePermissions();
  const toast = useToast();
  const decide = useDecideEvidence();
  const recheck = useRecheckEvidence();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('review');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<EvidenceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [exporting, setExporting] = useState(false);

  const counts = useMemo(() => {
    const out = { review: 0, checking: 0, verified: 0, rejected: 0, all: data?.length ?? 0 } as Record<Filter, number>;
    for (const r of data ?? []) {
      const s = evidenceState(r.completion);
      for (const f of ['review', 'checking', 'verified', 'rejected'] as const) if (FILTERS[f].states!.includes(s)) out[f]++;
    }
    return out;
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const states = FILTERS[filter].states;
    return (data ?? []).filter(
      (r) =>
        (!states || states.includes(evidenceState(r.completion))) &&
        (!q || r.person.fullName.toLowerCase().includes(q) || r.item.title.toLowerCase().includes(q)),
    );
  }, [data, search, filter]);

  // Derived from the (polled) list, so the open viewer updates when a check finishes.
  const viewing = data?.find((r) => r.completion.id === viewingId) ?? null;

  const approve = (r: EvidenceRecord) =>
    decide.mutate(
      { completionId: r.completion.id, decision: 'verified' },
      {
        onSuccess: () => toast(`Approved ${r.person.fullName}'s evidence.`),
        onError: (err) => toast(errorMessage(err), 'error'),
      },
    );

  const confirmReject = () => {
    if (!rejecting || !reason.trim()) return;
    decide.mutate(
      { completionId: rejecting.completion.id, decision: 'rejected', note: reason.trim() },
      {
        onSuccess: () => {
          toast(`Rejected - ${rejecting.person.fullName} will see your reason.`);
          setRejecting(null);
          setReason('');
        },
        onError: (err) => toast(errorMessage(err), 'error'),
      },
    );
  };

  const rerun = (r: EvidenceRecord) =>
    recheck.mutate(r.completion.id, {
      onSuccess: () => toast('Check queued - the result appears in a moment.'),
      onError: (err) => toast(errorMessage(err), 'error'),
    });

  const exportLog = async () => {
    setExporting(true);
    try {
      await downloadTeamReport('evidence', { cycleId });
      toast('Evidence register downloaded.');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const status = (r: EvidenceRecord) => {
    const look = EVIDENCE_STATE[evidenceState(r.completion)];
    return <StatusText color={look.color}>{look.label}</StatusText>;
  };

  const columns: Column<EvidenceRecord>[] = [
    {
      key: 'member',
      header: 'Member',
      primary: true,
      render: (r) => (
        <span className="inline-flex items-center gap-2.5">
          <Avatar initials={r.person.initials} color={r.person.avatarColor} size={26} />
          <span className="font-medium">{r.person.fullName}</span>
        </span>
      ),
    },
    {
      key: 'activity',
      header: 'Activity',
      render: (r) => (
        <span className="font-medium text-ink">
          {r.item.title}
          {r.item.archived ? <span className="ml-1.5 text-[10px] uppercase tracking-[1px] text-faint">archived</span> : null}
        </span>
      ),
    },
    { key: 'hours', header: 'Hours', render: (r) => formatHours(r.item.hours), className: 'whitespace-nowrap text-[rgba(38,39,25,.7)]' },
    { key: 'date', header: 'Completed', render: (r) => formatDate(r.completion.completedOn), className: 'whitespace-nowrap text-[rgba(38,39,25,.7)]' },
    { key: 'status', header: 'Status', render: status },
    {
      key: 'reason',
      header: 'Notes',
      render: (r) => r.completion.reviewNotes || r.completion.reflection || '-',
      className: 'min-w-[220px] max-w-[320px] text-[12px] leading-[18px] text-[rgba(38,39,25,.6)]',
    },
    {
      key: 'evidence',
      header: 'Evidence',
      hideOnMobile: true,
      render: (r) => (
        <Button size="sm" onClick={() => setViewingId(r.completion.id)}>
          {canDecide && evidenceState(r.completion) === 'flagged' ? 'Review' : r.completion.evidence ? 'View' : 'Details'}
        </Button>
      ),
    },
  ];

  const state = viewing ? evidenceState(viewing.completion) : null;
  const busy = decide.isPending || recheck.isPending;

  return (
    <Page title="Evidence Review" subtitle="Certificates and screenshots submitted">
      {isPending ? <PageSkeleton stats={0} panels={1} /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <Panel padded={false} className="animate-fade-up">
          <div className="px-5 pt-[22px] sm:px-6">
            <PanelHeader
              title="Submitted evidence"
              subtitle={`${data.length} submissions · ${counts.review} need review`}
              actions={
                <>
                  <input
                    type="search"
                    aria-label="Search evidence"
                    placeholder="Search by name or activity"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pa-input !w-[230px] !py-2"
                  />
                  <Button onClick={() => void exportLog()} loading={exporting}>
                    Export log
                  </Button>
                </>
              }
            />
            <Tabs
              size="sm"
              className="mt-3 overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none]"
              value={filter}
              onChange={setFilter}
              tabs={(Object.keys(FILTERS) as Filter[]).map((id) => ({ id, label: `${FILTERS[id].label} (${counts[id]})` }))}
            />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.completion.id}
            empty={search ? 'No submissions match your search.' : filter === 'review' ? 'Nothing waiting for review.' : 'No submissions here.'}
            mobileActions={(r) => (
              <Button size="sm" onClick={() => setViewingId(r.completion.id)}>
                {r.completion.evidence ? 'View evidence' : 'Details'}
              </Button>
            )}
          />
        </Panel>
      ) : null}

      <EvidenceViewer
        target={
          viewing
            ? {
                completionId: viewing.completion.id,
                title: viewing.item.title,
                meta: `${viewing.person.fullName} · ${formatDate(viewing.completion.completedOn)}`,
                reflection: viewing.completion.reflection,
                hasFile: !!viewing.completion.evidence,
              }
            : null
        }
        onClose={() => setViewingId(null)}
        details={
          viewing?.completion.evidence ? (
            <EvidenceCheckPanel completion={viewing.completion} item={viewing.item} personName={viewing.person.fullName} detailed />
          ) : null
        }
        actions={
          viewing && canDecide && viewing.completion.evidence ? (
            <div className="mr-auto flex flex-wrap gap-2">
              {state !== 'approved' ? (
                <Button variant="success" size="lg" disabled={busy} onClick={() => approve(viewing)}>
                  Approve
                </Button>
              ) : null}
              {state !== 'rejected' ? (
                <Button variant="danger" size="lg" disabled={busy} onClick={() => setRejecting(viewing)}>
                  Reject
                </Button>
              ) : null}
              {state !== 'checking' ? (
                <Button variant="link" disabled={busy} onClick={() => rerun(viewing)}>
                  Re-run check
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        busy={decide.isPending}
        title="Reject evidence"
        subtitle={rejecting ? `${rejecting.person.fullName} · ${rejecting.item.title}` : undefined}
        width={480}
        compact
        accent={C.red}
        footer={
          <>
            <Button size="lg" onClick={() => setRejecting(null)} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button size="lg" variant="danger" loading={decide.isPending} disabled={!reason.trim()} onClick={confirmReject}>
              Reject
            </Button>
          </>
        }
      >
        <p className="mb-3 text-[13px] leading-[21px] text-body">
          The item goes back to <strong>outstanding</strong> and they are asked to upload the correct evidence.
        </p>
        <TextArea
          label="Reason (shown to them)"
          rows={3}
          maxLength={REJECT_MAX}
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={rejecting?.completion.reviewNotes ?? 'e.g. This certificate is for a different course.'}
        />
        {!reason && rejecting?.completion.reviewNotes ? (
          <Button variant="link" className="mt-1.5" onClick={() => setReason(rejecting.completion.reviewNotes!)}>
            Use the automatic check's reason
          </Button>
        ) : null}
      </Modal>
    </Page>
  );
}
