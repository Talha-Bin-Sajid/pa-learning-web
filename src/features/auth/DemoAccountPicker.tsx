import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/bits';
import { authAdapter, DemoAuth } from '@/lib/auth-client';
import { config } from '@/lib/config';
import { ROLE_LABEL } from '@/lib/palette';
import type { UserRole } from '@/types/api';

interface DemoAccount {
  authUserId: string;
  fullName: string;
  email: string;
  initials: string;
  avatarColor: string | null;
  role: UserRole;
  designation: string | null;
}

/** DEV ONLY: the prototype's "Pick an account" list, backed by the local demo server. */
export function DemoAccountPicker() {
  const origin = config.apiUrl.replace(/\/api\/v1$/, '');
  const { data, error, isPending } = useQuery({
    queryKey: ['demo-accounts'],
    queryFn: async () => (await (await fetch(`${origin}/demo/accounts`)).json()) as DemoAccount[],
  });

  return (
    <div>
      <div className="mb-3 bg-[#fff8e6] px-3.5 py-2.5 text-[12px] leading-5 text-[#7a5a00]">
        Local demo mode - in-memory data, no Supabase. Pick anyone to see the platform as them.
      </div>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[1.3px] text-faint">
        Pick an account
      </div>
      {isPending ? <div className="text-[13px] text-muted">Loading demo accounts…</div> : null}
      {error ? (
        <div className="text-[13px] text-pa-red">Start the demo API first: cd backend && npm run demo</div>
      ) : null}
      <div className="border border-[rgba(0,0,0,.12)]">
        {data?.map((a) => (
          <button
            key={a.authUserId}
            type="button"
            onClick={() => (authAdapter() as DemoAuth).signInAs(a.authUserId)}
            className="flex w-full cursor-pointer items-center gap-3 border-b border-line px-4 py-[13px] text-left hover:bg-panel"
          >
            <Avatar initials={a.initials} color={a.avatarColor} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-ink">{a.fullName}</span>
              <span className="block text-[11px] text-faint">
                {a.designation ?? 'No designation'} · {a.email}
              </span>
            </span>
            <span className="text-[10px] uppercase tracking-[1.2px] text-subtle">{ROLE_LABEL[a.role]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
