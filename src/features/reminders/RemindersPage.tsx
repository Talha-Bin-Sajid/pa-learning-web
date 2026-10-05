import { useEffect, useState } from 'react';
import { Page } from '@/components/layout/Page';
import { useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea } from '@/components/ui/Field';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Avatar, EmptyState, StatusText } from '@/components/ui/bits';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { C } from '@/lib/palette';
import type { CcPolicy, OverdueFrequency, ReminderSettings } from '@/types/api';
import {
  useReminderCandidates,
  useReminderLog,
  useReminderSettings,
  useSaveReminderSettings,
  useSendReminders,
} from './api';

const LEAD_OPTIONS = [
  { value: '7', label: '7 days before' },
  { value: '14', label: '14 days before' },
  { value: '30', label: '30 days before' },
  { value: '30,14,7', label: '30, 14 and 7 days before' },
  { value: '', label: 'Never before the due date' },
];
const TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00'];
const EVERY: Record<OverdueFrequency, string> = {
  daily: 'every day',
  weekly: 'every week',
  fortnightly: 'every fortnight',
};

function SettingsPanel({ saved }: { saved: ReminderSettings }) {
  const save = useSaveReminderSettings();
  const toast = useToast();
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);

  const lead = draft.leadDays.join(',');
  const leadOptions = LEAD_OPTIONS.some((o) => o.value === lead)
    ? LEAD_OPTIONS
    : [{ value: lead, label: `${draft.leadDays.join(', ')} days before` }, ...LEAD_OPTIONS];
  const dirty = JSON.stringify({ ...draft, updatedAt: 0 }) !== JSON.stringify({ ...saved, updatedAt: 0 });

  const persist = async (changes: Partial<ReminderSettings>, message: string) => {
    try {
      await save.mutateAsync(changes);
      toast(message);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const note = draft.autoEnabled
    ? `Reminders go out at ${draft.sendTime} (${draft.timezone}) to each person’s sign-in email - ${draft.leadDays.length ? `${draft.leadDays.join(', ')} days before a due date, then ` : ''}${EVERY[draft.overdueFrequency]} while an item stays overdue.`
    : 'Automatic reminders are paused. Nothing is sent until this is switched back on.';

  return (
    <Panel accent={C.indigo}>
      <div className="flex items-start justify-between gap-3.5">
        <PanelHeader
          title="Automatic reminders"
          subtitle="Sent to each person’s sign-in address, with an optional copy to their line manager."
        />
        <Toggle
          label="Automatic reminders"
          checked={draft.autoEnabled}
          disabled={save.isPending}
          onChange={(on) => {
            setDraft((d) => ({ ...d, autoEnabled: on }));
            void persist(
              { autoEnabled: on },
              on ? 'Automatic reminders switched on.' : 'Automatic reminders paused.',
            );
          }}
        />
      </div>
      <div
        className={cn(
          'mt-5 grid grid-cols-1 gap-3.5 transition-opacity sm:grid-cols-2',
          !draft.autoEnabled && 'opacity-45',
        )}
      >
        <SelectField
          label="Before due date"
          value={lead}
          options={leadOptions}
          onChange={(e) =>
            setDraft((d) => ({ ...d, leadDays: e.target.value ? e.target.value.split(',').map(Number) : [] }))
          }
        />
        <SelectField
          label="While overdue"
          value={draft.overdueFrequency}
          onChange={(e) => setDraft((d) => ({ ...d, overdueFrequency: e.target.value as OverdueFrequency }))}
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'weekly', label: 'Every week' },
            { value: 'fortnightly', label: 'Every fortnight' },
          ]}
        />
        <SelectField
          label="Send at"
          value={draft.sendTime}
          onChange={(e) => setDraft((d) => ({ ...d, sendTime: e.target.value }))}
          options={(TIMES.includes(draft.sendTime) ? TIMES : [draft.sendTime, ...TIMES]).map((t) => ({
            value: t,
            label: t,
          }))}
        />
        <SelectField
          label="Copy line manager"
          value={draft.ccLineManager}
          onChange={(e) => setDraft((d) => ({ ...d, ccLineManager: e.target.value as CcPolicy }))}
          options={[
            { value: 'overdue', label: 'Only when overdue' },
            { value: 'always', label: 'On every reminder' },
            { value: 'never', label: 'Never' },
          ]}
        />
      </div>
      <div className="mt-[18px] bg-panel px-4 py-3.5 text-[12px] leading-5 text-[rgba(38,39,25,.7)]">
        {note}
      </div>
      <div className="mt-[18px] flex justify-end">
        <Button
          variant="primary"
          size="lg"
          disabled={!dirty}
          loading={save.isPending}
          onClick={() =>
            void persist(
              {
                leadDays: draft.leadDays,
                overdueFrequency: draft.overdueFrequency,
                sendTime: draft.sendTime,
                ccLineManager: draft.ccLineManager,
              },
              'Reminder settings saved.',
            )
          }
        >
          Save reminder settings
        </Button>
      </div>
    </Panel>
  );
}

function SendPanel() {
  const candidates = useReminderCandidates();
  const send = useSendReminders();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const list = candidates.data ?? [];

  const submit = async () => {
    try {
      const r = await send.mutateAsync({ profileIds: selected, message: message.trim() || null });
      toast(
        `Reminder emails sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}${r.failed ? ` - ${r.failed} failed` : ''}${r.skipped ? ` - ${r.skipped} skipped` : ''}.`,
        r.failed ? 'error' : 'info',
      );
      setSelected([]);
      setMessage('');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <Panel accent={C.red}>
      <PanelHeader
        title="Send a reminder now"
        subtitle={
          selected.length
            ? `${selected.length} selected - emails go to their sign-in addresses`
            : 'Pick who to chase, or select everyone overdue'
        }
        actions={
          <Button onClick={() => setSelected(list.filter((c) => c.overdueCount > 0).map((c) => c.person.id))}>
            Select all overdue
          </Button>
        }
        className="mb-4"
      />
      {candidates.isPending ? <PageSkeleton stats={0} panels={1} /> : null}
      {candidates.error ? (
        <ErrorState error={candidates.error} onRetry={() => void candidates.refetch()} />
      ) : null}
      <div className="max-h-[420px] overflow-y-auto">
        {list.map((c) => {
          const on = selected.includes(c.person.id);
          return (
            <label
              key={c.person.id}
              className={cn(
                'mb-2 flex cursor-pointer items-center gap-3 border px-3 py-[11px] transition-colors',
                on
                  ? 'border-[rgba(0,0,0,.3)] bg-panel'
                  : 'border-[rgba(0,0,0,.12)] bg-white hover:bg-panel/60',
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setSelected((s) => (on ? s.filter((x) => x !== c.person.id) : [...s, c.person.id]))
                }
                className="size-[18px] shrink-0 cursor-pointer accent-black"
              />
              <Avatar initials={c.person.initials} color={c.person.avatarColor} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{c.person.fullName}</span>
                <span className="block truncate text-[11px] text-faint">{c.person.email}</span>
              </span>
              <StatusText color={c.overdueCount ? C.red : 'rgba(38,39,25,.55)'}>
                {c.overdueCount ? `${c.overdueCount} overdue` : `${c.outstandingCount} outstanding`}
              </StatusText>
            </label>
          );
        })}
        {candidates.data && list.length === 0 ? (
          <EmptyState tone="success" className="py-2">
            Nothing outstanding across the firm.
          </EmptyState>
        ) : null}
      </div>
      <TextArea
        className="mt-3.5"
        label="Message"
        placeholder="Optional note added to the reminder email"
        value={message}
        maxLength={2000}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="mt-3.5 flex justify-end">
        <Button
          variant="dark"
          size="lg"
          disabled={!selected.length}
          loading={send.isPending}
          onClick={() => void submit()}
        >
          Send reminder emails
        </Button>
      </div>
    </Panel>
  );
}

function LogPanel() {
  const log = useReminderLog();
  return (
    <Panel>
      <PanelHeader title="Reminder log" className="mb-3.5" />
      {log.isPending ? <PageSkeleton stats={0} panels={1} /> : null}
      {log.data?.map((l) => (
        <div
          key={l.id}
          className="flex flex-wrap items-start gap-x-3.5 gap-y-1 border-b border-line py-[11px] text-[13px]"
        >
          <div className="w-[120px] shrink-0 text-[11px] text-faint">{formatDateTime(l.sentAt)}</div>
          <div className="w-[90px] shrink-0">
            <StatusText
              color={l.deliveryStatus === 'failed' ? C.red : l.kind === 'automatic' ? C.purple : C.blue}
            >
              {l.deliveryStatus === 'failed' ? 'Failed' : l.kind}
            </StatusText>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {l.recipient.fullName} - {l.recipient.email}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              {l.outstandingCount} outstanding{l.overdueCount ? `, ${l.overdueCount} overdue` : ''}
              {l.triggers
                .filter((t) => t.startsWith('due_in_'))
                .map((t) => ` · ${t.slice(7)}-day due-date reminder`)}
              {l.sentBy ? ` · sent by ${l.sentBy}` : ''}
              {l.hasNote ? ' · note attached' : ''}
              {l.ccEmails.length ? ` · cc ${l.ccEmails.join(', ')}` : ''}
            </div>
          </div>
        </div>
      ))}
      {log.data?.length === 0 ? <EmptyState>No reminders sent yet.</EmptyState> : null}
    </Panel>
  );
}

export default function RemindersPage() {
  const settings = useReminderSettings();
  return (
    <Page title="Reminders" subtitle="Automatic and manual chasing of outstanding learning">
      {settings.error ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : null}
      <div className="stagger space-y-5">
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_1.15fr]">
          {settings.data ? <SettingsPanel saved={settings.data} /> : <PageSkeleton stats={0} panels={1} />}
          <SendPanel />
        </div>
        <LogPanel />
      </div>
    </Page>
  );
}
