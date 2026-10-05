import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ReminderCandidate, ReminderLogEntry, ReminderSettings, SendResult } from '@/types/api';

export function useReminderSettings() {
  return useQuery({ queryKey: ['reminders', 'settings'], queryFn: () => api.get<ReminderSettings>('/reminders/settings') });
}

export function useReminderCandidates() {
  return useQuery({ queryKey: ['reminders', 'candidates'], queryFn: () => api.get<ReminderCandidate[]>('/reminders/candidates') });
}

export function useReminderLog() {
  return useQuery({ queryKey: ['reminders', 'log'], queryFn: () => api.get<ReminderLogEntry[]>('/reminders/log', { limit: 50 }) });
}

export function useSaveReminderSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<ReminderSettings>) => api.put<ReminderSettings>('/reminders/settings', changes),
    onSuccess: (saved) => qc.setQueryData(['reminders', 'settings'], saved),
  });
}

export function useSendReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { profileIds: string[]; message: string | null }) => api.post<SendResult>('/reminders/send', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders', 'log'] }),
  });
}
