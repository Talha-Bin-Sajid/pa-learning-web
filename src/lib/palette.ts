import type { ItemStatus, UserRole } from '@/types/api';

/** Brand colours from the prototype (for inline SVG / dynamic styles). */
export const C = {
  blue: '#2d8dfe',
  indigo: '#6663fb',
  cyan: '#57bfdf',
  teal: '#3193b1',
  purple: '#8843f8',
  red: '#ec4f3c',
  deep: '#2c609c',
  green: '#15b85f',
  amber: '#d98a16',
  ink: '#000000',
  track: '#ecf4ff',
  muted: 'rgba(38,39,25,.5)',
} as const;

export const ROLE_LABEL: Record<UserRole, string> = {
  learning_team: 'Learning Team',
  hr: 'HR Team',
  manager: 'Manager',
  team_member: 'Team Member',
};

export const ROLE_COLOR: Record<UserRole, string> = {
  learning_team: C.purple,
  hr: C.indigo,
  manager: C.deep,
  team_member: C.teal,
};

/** Category colours in a stable order (donut + legend). */
export const CATEGORY_COLORS = [C.blue, C.purple, C.cyan, C.teal, C.indigo, C.red, C.deep];

/** Progress bar colour: green complete, blue on track, red behind. */
export function progressColor(pct: number): string {
  return pct >= 100 ? C.green : pct >= 60 ? C.blue : C.red;
}

export function statusColor(status: ItemStatus): string {
  return status === 'completed' ? C.green : status === 'overdue' ? C.red : C.blue;
}
