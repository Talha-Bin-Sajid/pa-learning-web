import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { anyChecking } from '@/components/shared/evidence-status';
import { api } from '@/lib/api-client';
import type { Completion, EvidenceRecord, MyReportKind, Plan } from '@/types/api';
import { useCycle } from '../cycles/CycleProvider';

export const myKeys = {
  plan: (cycleId?: string) => ['my-plan', cycleId ?? 'current'] as const,
  evidence: (cycleId?: string) => ['my-evidence', cycleId ?? 'current'] as const,
};

export function useMyPlan() {
  const { cycleId } = useCycle();
  return useQuery({
    queryKey: myKeys.plan(cycleId),
    queryFn: () => api.get<Plan>('/me/plan', { cycleId }),
    // Poll while a just-uploaded certificate is being checked.
    refetchInterval: (q) => (anyChecking((q.state.data?.entries ?? []).map((e) => e.completion)) ? 4000 : false),
  });
}

export function useMyEvidence() {
  const { cycleId } = useCycle();
  return useQuery({
    queryKey: myKeys.evidence(cycleId),
    queryFn: () => api.get<EvidenceRecord[]>('/me/completions', { cycleId }),
    refetchInterval: (q) => (anyChecking((q.state.data ?? []).map((r) => r.completion)) ? 4000 : false),
  });
}

export interface SubmitEvidenceInput {
  itemId: string;
  completedOn: string;
  reflection: string;
  file: File | null;
}

/** Upload / replace evidence; refreshes my plan, my evidence and any team views. */
export function useSubmitEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, completedOn, reflection, file }: SubmitEvidenceInput) => {
      const form = new FormData();
      form.set('completedOn', completedOn);
      if (reflection.trim()) form.set('reflection', reflection.trim());
      if (file) form.set('file', file);
      return api.upload<Completion>('PUT', `/me/completions/${itemId}`, form);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-plan'] });
      void qc.invalidateQueries({ queryKey: ['my-evidence'] });
      void qc.invalidateQueries({ queryKey: ['progress'] });
      void qc.invalidateQueries({ queryKey: ['evidence-register'] });
    },
  });
}

export function downloadMyReport(kind: MyReportKind, period: { from?: string; to?: string; cycleId?: string }) {
  return api.download(`/reports/me/${kind}`, period);
}
