import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { EvidenceMode, ImportPreview, ItemImportSummary, LearningItem, Lookups } from '@/types/api';
import { useCycle } from '../cycles/CycleProvider';

export const itemKeys = {
  list: (cycleId?: string, archived = false) => ['items', cycleId ?? 'current', archived] as const,
};

export function useLookups() {
  return useQuery({ queryKey: ['lookups'], queryFn: () => api.get<Lookups>('/lookups'), staleTime: 30 * 60_000 });
}

export function useItems(options: { enabled?: boolean; includeArchived?: boolean } = {}) {
  const { cycleId } = useCycle();
  return useQuery({
    queryKey: itemKeys.list(cycleId, options.includeArchived),
    queryFn: () => api.get<LearningItem[]>('/items', { cycleId, includeArchived: options.includeArchived ? 'true' : undefined }),
    enabled: options.enabled ?? true,
  });
}

export interface ItemInput {
  title: string;
  categoryId: number;
  cpdTypeId: number;
  deliveryTypeId: number;
  provider: string | null;
  hours: number;
  dueDate: string | null;
  isMandatory: boolean;
  evidenceMode: EvidenceMode;
  link: string | null;
  description: string | null;
  audience: { all: boolean; designationIds: number[]; profileIds: string[] };
}

function useInvalidateTemplate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['items'] }),
      qc.invalidateQueries({ queryKey: ['progress'] }),
      qc.invalidateQueries({ queryKey: ['my-plan'] }),
    ]);
}

export function useSaveItem() {
  const { cycleId } = useCycle();
  const invalidate = useInvalidateTemplate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ItemInput }) =>
      id ? api.put<LearningItem>(`/items/${id}`, input) : api.post<LearningItem>('/items', { ...input, cycleId }),
    onSuccess: invalidate,
  });
}

export function useArchiveItem() {
  const invalidate = useInvalidateTemplate();
  return useMutation({ mutationFn: (id: string) => api.delete(`/items/${id}`), onSuccess: invalidate });
}

export function usePreviewItemImport() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set('file', file);
      return api.upload<ImportPreview<ItemImportSummary>>('POST', '/items/import/preview', form);
    },
  });
}

export function useCommitItemImport() {
  const { cycleId } = useCycle();
  const invalidate = useInvalidateTemplate();
  return useMutation({
    mutationFn: (rows: { rowNumber: number; values: Record<string, string> }[]) =>
      api.post<{ created: number }>('/items/import', { cycleId, rows }),
    onSuccess: invalidate,
  });
}

export const downloadItemTemplate = () => api.download('/items/import/template');
