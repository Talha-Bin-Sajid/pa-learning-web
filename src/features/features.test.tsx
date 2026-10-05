import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/shared/Toast';
import { DataTable } from '@/components/ui/DataTable';
import { EvidenceCheckPanel } from '@/components/shared/EvidenceCheckPanel';
import { CHECK, completion, entry } from '@/test/fixtures';
import { PlanCard } from './my-learning/PlanCard';
import { UploadEvidenceDialog } from './my-learning/UploadEvidenceDialog';

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

describe('PlanCard', () => {
  it('shows overdue status and an upload action for outstanding work', async () => {
    const onUpload = vi.fn();
    render(<PlanCard entry={entry({ status: 'overdue', daysOverdue: 10, daysUntilDue: -10 })} onUpload={onUpload} onView={vi.fn()} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open learning' })).toHaveAttribute('rel', 'noopener noreferrer');
    await userEvent.click(screen.getByRole('button', { name: 'Upload evidence' }));
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it('offers replace and view once completed, with the reflection', () => {
    const done = entry({
      status: 'completed',
      confirmed: true,
      daysUntilDue: null,
      completion: completion({ reflection: 'Applied the checklist.' }),
    });
    render(<PlanCard entry={done} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Completed 11 Feb 2026')).toBeInTheDocument();
    expect(screen.getByText('Applied the checklist.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace evidence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View evidence' })).toBeInTheDocument();
  });

  it('shows that the certificate is being checked, then the outcome', () => {
    const checking = completion({ check: { ...CHECK, status: 'queued', decision: null } });
    const { rerender } = render(<PlanCard entry={entry({ status: 'completed', completion: checking })} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByText('Checking evidence…')).toBeInTheDocument();

    const flagged = completion({ reviewStatus: 'flagged', reviewSource: 'ai', reviewNotes: 'No course title could be found.', check: CHECK });
    rerender(<PlanCard entry={entry({ status: 'completed', completion: flagged })} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.getByText(/No course title could be found\. It still counts/)).toBeInTheDocument();
  });

  it('labels completed-but-unconfirmed work as Submitted, confirmed work as Completed', () => {
    const flagged = completion({ reviewStatus: 'flagged', reviewSource: 'ai', check: CHECK });
    const { rerender } = render(<PlanCard entry={entry({ status: 'completed', confirmed: false, completion: flagged })} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    const verified = completion({ reviewStatus: 'verified', reviewSource: 'ai', check: CHECK });
    rerender(<PlanCard entry={entry({ status: 'completed', confirmed: true, completion: verified })} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('explains a rejection and asks for a re-upload', () => {
    const rejected = completion({ reviewStatus: 'rejected', reviewSource: 'manual', reviewNotes: 'Wrong course.' });
    render(<PlanCard entry={entry({ status: 'overdue', rejected })} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Evidence rejected. Wrong course.');
    expect(screen.getByRole('button', { name: 'Upload evidence' })).toBeInTheDocument();
  });

  it('labels acknowledgement items as confirm-only', () => {
    render(<PlanCard entry={entry({}, { evidenceMode: 'acknowledgement' })} onUpload={vi.fn()} onView={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirm complete' })).toBeInTheDocument();
  });
});

describe('EvidenceCheckPanel', () => {
  it('shows reviewers expected vs found with a verdict per field', () => {
    const c = completion({
      reviewStatus: 'flagged',
      reviewSource: 'ai',
      reviewNotes: 'The certificate is for "Excel basics", not "AML".',
      check: { ...CHECK, checks: { name: 'match', title: 'mismatch', provider: 'not_found' }, extracted: { ...CHECK.extracted!, courseTitle: 'Excel basics', provider: null } },
    });
    render(<EvidenceCheckPanel completion={c} item={entry().item} personName="Sarah Whitfield" detailed />);
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toHaveTextContent('Confidence 92%');
    const course = screen.getByRole('row', { name: /Course/ });
    expect(course).toHaveTextContent('Excel basics');
    expect(within(course).getByLabelText('Does not match')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Name/ })).getByLabelText('Matches')).toBeInTheDocument();
  });

  it('keeps the staff view to the outcome', () => {
    render(<EvidenceCheckPanel completion={completion({ reviewStatus: 'verified', reviewSource: 'ai', check: CHECK })} item={entry().item} personName="Sarah" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('UploadEvidenceDialog', () => {
  it('blocks submission without a certificate and never calls the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    wrap(<UploadEvidenceDialog entry={entry()} today="2026-09-10" onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Upload completion evidence' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Attach a certificate or screenshot');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('DataTable', () => {
  it('renders a semantic table plus phone cards from the same columns', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', header: 'Name', primary: true, render: (r: { name: string; hours: number }) => r.name },
          { key: 'hours', header: 'Hours', render: (r) => `${r.hours} h` },
        ]}
        rows={[{ name: 'GDPR', hours: 1 }]}
        rowKey={(r) => r.name}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getAllByText('GDPR')).toHaveLength(2); // table row + phone card
  });

  it('shows the empty message', () => {
    render(<DataTable columns={[]} rows={[]} rowKey={() => ''} empty="No learning items yet." />);
    expect(screen.getByText('No learning items yet.')).toBeInTheDocument();
  });
});
