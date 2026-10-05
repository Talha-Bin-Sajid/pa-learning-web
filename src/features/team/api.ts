import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { anyChecking } from '@/components/shared/evidence-status';
import { api } from '@/lib/api-client';
import type { Completion, EvidenceRecord, MemberProgress, Overview, Plan, TeamReportKind } from '@/types/api';
import { useCycle } from '../cycles/CycleProvider';

export function useOverview() {
  const { cycleId } = useCycle();
  return useQuery({ queryKey: ['progress', 'overview', cycleId ?? 'current'], queryFn: () => api.get<Overview>('/progress/overview', { cycleId }) });
}

export function useMembers() {
  const { cycleId } = useCycle();
  return useQuery({ queryKey: ['progress', 'members', cycleId ?? 'current'], queryFn: () => api.get<MemberProgress[]>('/progress/members', { cycleId }) });
}

export function useMemberPlan(profileId: string | undefined) {
  const { cycleId } = useCycle();
  return useQuery({
    queryKey: ['progress', 'member', profileId, cycleId ?? 'current'],
    queryFn: () => api.get<Plan>(`/progress/members/${profileId}`, { cycleId }),
    enabled: !!profileId,
  });
}

export function useEvidenceRegister(filters: { from?: string; to?: string }) {
  const { cycleId } = useCycle();
  return useQuery({
    queryKey: ['evidence-register', cycleId ?? 'current', filters.from, filters.to],
    queryFn: () => api.get<EvidenceRecord[]>('/completions', { cycleId, ...filters }),
    // Keep polling while automatic checks are running.
    refetchInterval: (q) => (anyChecking((q.state.data ?? []).map((r) => r.completion)) ? 4000 : false),
  });
}

function useEvidenceMutation<V>(fn: (v: V) => Promise<Completion>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['evidence-register'] });
      void qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

/** Learning Team: approve or reject a submission. */
export function useDecideEvidence() {
  return useEvidenceMutation((v: { completionId: string; decision: 'verified' | 'rejected'; note?: string }) =>
    api.post<Completion>(`/completions/${v.completionId}/review`, { decision: v.decision, note: v.note || undefined }),
  );
}

/** Learning Team: run the automatic check again. */
export function useRecheckEvidence() {
  return useEvidenceMutation((completionId: string) => api.post<Completion>(`/completions/${completionId}/recheck`, {}));
}

export function downloadTeamReport(kind: TeamReportKind, params: { cycleId?: string; from?: string; to?: string }) {
  return api.download(`/reports/team/${kind}`, params);
}
