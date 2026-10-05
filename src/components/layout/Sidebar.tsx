import { NavLink } from 'react-router';
import { navFor, type NavItem } from '@/app/navigation';
import { Avatar } from '@/components/ui/bits';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useItems } from '@/features/learning-items/api';
import { useMyPlan } from '@/features/my-learning/api';
import { cn } from '@/lib/cn';

function useBadges(manageItems: boolean): Record<NonNullable<NavItem['badge']>, number> {
  const plan = useMyPlan();
  const items = useItems({ enabled: manageItems });
  return {
    myPending: plan.data?.summary.outstanding ?? 0,
    templateCount: items.data?.length ?? 0,
  };
}

/** The prototype's black sidebar: brand, signed-in person, navigation, sign-out. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, permissions } = useMe();
  const { signOut } = useAuth();
  const badges = useBadges(permissions.manageItems);
  const sections = navFor(permissions);

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-[22px]">
        <img src="/brand-mark.png" alt="" className="block h-auto w-[34px]" />
        <div>
          <div className="text-[11px] font-semibold tracking-[1.3px]">PROJECT ACCOUNTANTS</div>
          <div className="text-[10px] tracking-[1.3px] text-white/40">LEARNING PLATFORM</div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-[18px]">
        <Avatar initials={profile.initials} color={profile.avatarColor} size={38} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{profile.fullName}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[1.2px] text-white/50">{profile.designation?.name ?? 'No designation'}</div>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto py-3.5">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && 'mt-3 border-t border-white/10 pt-3')}>
            {section.title ? <div className="px-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[1.3px] text-white/30">{section.title}</div> : null}
            {section.items.map((item) => {
              const badge = item.badge ? badges[item.badge] : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 border-l-[3px] px-5 py-[11px] transition-colors hover:bg-white/5 hover:text-white',
                      isActive ? 'border-pa-blue bg-white/8 text-white' : 'border-transparent text-white/70',
                    )
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{item.label}</div>
                    <div className="mt-px text-[10px] text-white/35">{item.sub}</div>
                  </div>
                  {badge > 0 ? <span className="bg-pa-blue px-[7px] py-0.5 text-[10px] font-semibold text-ink">{badge}</span> : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="mb-1 text-[10px] uppercase tracking-[1.2px] text-white/30">Signed in as</div>
        <div className="mb-3 break-all text-[10px] text-white/40">{profile.email}</div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full cursor-pointer border border-white/25 px-2.5 py-[9px] text-[10px] font-semibold uppercase tracking-[1.1px] text-white/80 transition-colors hover:border-white hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
