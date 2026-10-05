import { describe, expect, it } from 'vitest';
import type { Permissions } from '@/types/api';
import { landingPath, navFor } from './navigation';

const perms = (over: Partial<Permissions>): Permissions => ({
  scope: 'self',
  manageItems: false,
  manageCycles: false,
  manageUsers: false,
  manageReminders: false,
  reviewEvidence: false,
  decideEvidence: false,
  viewTeam: false,
  ...over,
});

const labels = (p: Permissions) => navFor(p).flatMap((s) => s.items.map((i) => i.label));

describe('navigation per role', () => {
  it('gives the Learning Team every page plus their own learning', () => {
    const p = perms({ scope: 'all', manageItems: true, manageCycles: true, manageUsers: true, manageReminders: true, reviewEvidence: true, viewTeam: true });
    expect(labels(p)).toEqual([
      'Dashboard',
      'Learning Template',
      'Bulk Upload',
      'Team Progress',
      'Evidence Review',
      'User Management',
      'Reminders',
      'Reports',
      'Learning Years',
      'My Dashboard',
      'My Learning Plan',
      'My Evidence',
      'My Reports',
    ]);
    expect(landingPath(p)).toBe('/dashboard');
  });

  it('gives HR team views and evidence review, no admin pages', () => {
    const l = labels(perms({ scope: 'all', reviewEvidence: true, viewTeam: true }));
    expect(l).toContain('Evidence Review');
    expect(l).not.toContain('User Management');
    expect(l).not.toContain('Learning Template');
  });

  it('gives a manager their team pages', () => {
    expect(labels(perms({ scope: 'team', viewTeam: true }))).toEqual([
      'Dashboard',
      'Team Progress',
      'Reports',
      'My Dashboard',
      'My Learning Plan',
      'My Evidence',
      'My Reports',
    ]);
  });

  it('keeps a team member to My pages, landing on My Dashboard', () => {
    const p = perms({});
    expect(navFor(p)).toHaveLength(1);
    expect(labels(p)).toEqual(['My Dashboard', 'My Learning Plan', 'My Evidence', 'My Reports']);
    expect(landingPath(p)).toBe('/my');
  });
});
