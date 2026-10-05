import { CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api, errorMessage } from '@/lib/api-client';
import type { EvidenceUrl } from '@/types/api';

export interface EvidenceTarget {
  completionId: string;
  title: string;
  meta: string;
  reflection?: string | null;
  hasFile: boolean;
}

interface EvidenceViewerProps {
  target: EvidenceTarget | null;
  onClose: () => void;
  /** Shown above the file (e.g. the automatic check result). */
  details?: ReactNode;
  /** Extra footer buttons (e.g. Approve / Reject). */
  actions?: ReactNode;
}

/**
 * Shows one piece of evidence via a short-lived signed URL fetched on open
 * (the backend checks the viewer may see it). Images inline, PDFs embedded.
 */
export function EvidenceViewer({ target, onClose, details, actions }: EvidenceViewerProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['evidence-url', target?.completionId],
    queryFn: () => api.get<EvidenceUrl>(`/completions/${target!.completionId}/evidence-url`),
    enabled: !!target?.hasFile,
    staleTime: 60_000, // links live 5 minutes
    gcTime: 60_000,
  });

  const isImage = data?.mimeType.startsWith('image/');

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={target?.title ?? ''}
      subtitle={target?.meta}
      width={760}
      footer={
        <>
          {actions}
          {data ? (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('outline', 'lg', false, 'hover:text-body')}
            >
              Open in new tab
            </a>
          ) : null}
          <Button variant="dark" size="lg" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {details ? <div className="mb-4">{details}</div> : null}
      {target?.hasFile ? (
        <div className="flex min-h-[220px] items-center justify-center bg-panel">
          {isLoading ? <CircularProgress size={24} /> : null}
          {error ? <div className="p-6 text-[13px] text-pa-red">{errorMessage(error)}</div> : null}
          {data && isImage ? (
            <img
              src={data.url}
              alt={`Evidence: ${data.fileName}`}
              className="max-h-[60vh] max-w-full object-contain"
            />
          ) : null}
          {data && !isImage ? (
            <iframe src={data.url} title={data.fileName} className="h-[60vh] w-full border-0 bg-white" />
          ) : null}
        </div>
      ) : (
        <div className="bg-panel px-6 py-10 text-center text-[11px] font-semibold uppercase tracking-[1.3px] text-faint">
          Acknowledged - no file required
        </div>
      )}
      {data ? <div className="mt-2 text-[11px] text-faint">{data.fileName}</div> : null}
      {target?.reflection ? (
        <div className="mt-4">
          <div className="micro-label mb-1.5">Reflection</div>
          <p className="bg-panel px-4 py-3 text-[13px] leading-[21px] text-body">{target.reflection}</p>
        </div>
      ) : null}
    </Modal>
  );
}
