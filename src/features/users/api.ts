import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ImportPreview, PersonAdmin, ProfileStatus, ReportingAccess, UserImportSummary, UserRole } from '@/types/api';

export const USERS_KEY = ['users'] as const;

export function useUsers(enabled = true) {
  return useQuery({ queryKey: USERS_KEY, queryFn: () => api.get<PersonAdmin[]>('/users'), enabled });
}

export interface PersonInput {
  fullName: string;
  email: string;
  role: UserRole;
  designationId: number | null;
  reportingAccess?: ReportingAccess;
  lineManagerId: string | null;
  status?: ProfileStatus;
}

function useInvalidatePeople() {
  const qc = useQueryClient();
  return () =>
    Promise.all([qc.invalidateQueries({ queryKey: USERS_KEY }), qc.invalidateQueries({ queryKey: ['progress'] }), qc.invalidateQueries({ queryKey: ['me'] })]);
}

export function useSavePerson() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: Partial<PersonInput> }) =>
      id ? api.patch<PersonAdmin>(`/users/${id}`, input) : api.post<PersonAdmin>('/users', input),
    onSuccess: invalidate,
  });
}

export function useBulkUpdatePeople() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: (updates: (Partial<PersonInput> & { id: string })[]) => api.patch<PersonAdmin[]>('/users', { updates }),
    onSuccess: invalidate,
  });
}

export function usePreviewUserImport() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set('file', file);
      return api.upload<ImportPreview<UserImportSummary>>('POST', '/users/import/preview', form);
    },
  });
}

export function useCommitUserImport() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: (rows: { rowNumber: number; values: Record<string, string> }[]) => api.post<{ added: number; updated: number }>('/users/import', { rows }),
    onSuccess: invalidate,
  });
}

export const downloadUserTemplate = () => api.download('/users/import/template');
