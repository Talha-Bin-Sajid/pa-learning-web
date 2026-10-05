import { useState } from 'react';
import { Page } from '@/components/layout/Page';
import { EvidenceCheckPanel } from '@/components/shared/EvidenceCheckPanel';
import { EvidenceViewer } from '@/components/shared/EvidenceViewer';
import { EVIDENCE_STATE, evidenceState } from '@/components/shared/evidence-status';
import { Panel } from '@/components/ui/Panel';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { formatDate } from '@/lib/format';
import { useMyEvidence } from './api';

export default function MyEvidencePage() {
  const { data, isPending, error, refetch } = useMyEvidence();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = data?.find((r) => r.completion.id === viewingId) ?? null;

  return (
    <Page title="My Evidence" subtitle="Completion proof I have uploaded">
      {isPending ? <PageSkeleton stats={4} panels={0} /> : null}
      {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {data?.length === 0 ? <Panel className="py-12 text-center text-[14px] text-muted">No evidence uploaded yet.</Panel> : null}
      {data?.length ? (
        <div className="stagger grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {data.map(({ completion, item }) => (
            <button
              key={completion.id}
              type="button"
              onClick={() => setViewingId(completion.id)}
              className="cursor-pointer bg-white p-5 text-left shadow-card transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card-hover"
              style={{ borderTop: '3px solid #57bfdf' }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[1.3px] text-faint">
                {completion.evidence?.mimeType === 'application/pdf' ? 'PDF document' : 'Image'}
              </div>
              <div className="mt-2.5 text-[14px] font-semibold leading-5 text-ink">{item.title}</div>
              <div className="mt-2 text-[12px] text-muted">{formatDate(completion.completedOn)}</div>
              <div className="mt-0.5 truncate text-[11px] text-subtle">{completion.evidence?.fileName}</div>
              <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-[1.1px]" style={{ color: EVIDENCE_STATE[evidenceState(completion)].color }}>
                {EVIDENCE_STATE[evidenceState(completion)].label}
              </div>
            </button>
          ))}
        </div>
      ) : null}
      <EvidenceViewer
        target={
          viewing
            ? {
                completionId: viewing.completion.id,
                title: viewing.item.title,
                meta: formatDate(viewing.completion.completedOn),
                reflection: viewing.completion.reflection,
                hasFile: !!viewing.completion.evidence,
              }
            : null
        }
        onClose={() => setViewingId(null)}
        details={
          viewing?.completion.evidence ? (
            <EvidenceCheckPanel completion={viewing.completion} item={viewing.item} personName={viewing.person.fullName} />
          ) : null
        }
      />
    </Page>
  );
}
