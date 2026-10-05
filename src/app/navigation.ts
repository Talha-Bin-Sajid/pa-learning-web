import type { Permissions } from '@/types/api';

export type Capability = Exclude<keyof Permissions, 'scope'>;

export interface NavItem {
  to: string;
  label: string;
  sub: string;
  requires?: Capability;
  badge?: 'templateCount' | 'myPending';
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/** Every page, with the capability it needs (the backend enforces the same rules). */
export const TEAM_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', sub: 'Programme overview', requires: 'viewTeam' },
  { to: '/template', label: 'Learning Template', sub: 'Manage items', requires: 'manageItems', badge: 'templateCount' },
  { to: '/template/import', label: 'Bulk Upload', sub: 'Import from Excel', requires: 'manageItems' },
  { to: '/team', label: 'Team Progress', sub: 'Completion by member', requires: 'viewTeam' },
  { to: '/evidence', label: 'Evidence Review', sub: 'Submitted proof', requires: 'reviewEvidence' },
  { to: '/users', label: 'User Management', sub: 'Roles and access', requires: 'manageUsers' },
  { to: '/reminders', label: 'Reminders', sub: 'Chase outstanding', requires: 'manageReminders' },
  { to: '/reports', label: 'Reports', sub: 'Team export', requires: 'viewTeam' },
  { to: '/years', label: 'Learning Years', sub: 'Programme cycles', requires: 'manageCycles' },
];

export const MY_NAV: NavItem[] = [
  { to: '/my', label: 'My Dashboard', sub: 'My progress' },
  { to: '/my/plan', label: 'My Learning Plan', sub: 'Assigned to me', badge: 'myPending' },
  { to: '/my/evidence', label: 'My Evidence', sub: 'Uploaded proof' },
  { to: '/my/reports', label: 'My Reports', sub: 'CPD downloads' },
];

export function can(p: Permissions, capability?: Capability): boolean {
  return !capability || p[capability];
}

/** Sidebar sections for a person. People without team visibility see only "My learning". */
export function navFor(p: Permissions): NavSection[] {
  const team = TEAM_NAV.filter((i) => can(p, i.requires));
  if (team.length === 0) return [{ items: MY_NAV }];
  return [{ items: team }, { title: 'My learning', items: MY_NAV }];
}

/** Where a person lands after signing in. */
export function landingPath(p: Permissions): string {
  return p.viewTeam ? '/dashboard' : '/my';
}
