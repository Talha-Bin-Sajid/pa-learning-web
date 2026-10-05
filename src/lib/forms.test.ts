import { describe, expect, it, vi } from 'vitest';
import { authSchema } from '@/features/auth/auth.schema';
import { newYearSchema } from '@/features/cycles/cycle.schema';
import { itemSchema, toItemInput, type ItemFormValues } from '@/features/learning-items/item.schema';
import { evidenceSchema } from '@/features/my-learning/evidence.schema';
import { toPersonInput, userSchema } from '@/features/users/user.schema';
import { ApiError } from './api-client';
import { applyServerErrors, periodSchema, requiredPeriodSchema } from './forms';

/** Field → first message per field (what react-hook-form displays), for compact assertions. */
function errorsOf(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const out: Record<string, string> = {};
  for (const i of result.error?.issues ?? []) out[i.path.join('.')] ??= i.message;
  return out;
}

describe('auth schema', () => {
  const base = { mode: 'in' as const, fullName: '', email: 'apatel@projectaccountants.co.uk', password: 'x' };

  it('signs in with any non-empty password', () => {
    expect(authSchema.safeParse(base).success).toBe(true);
  });

  it('requires a valid email', () => {
    expect(errorsOf(authSchema.safeParse({ ...base, email: 'nope' }))).toEqual({ email: 'Enter a valid email address' });
  });

  it('requires a name and 10+ character password to request access', () => {
    expect(errorsOf(authSchema.safeParse({ ...base, mode: 'up', password: 'short' }))).toEqual({
      fullName: 'Enter your full name',
      password: 'Use at least 10 characters',
    });
    expect(authSchema.safeParse({ ...base, mode: 'up', fullName: 'Amina Patel', password: 'long-enough-1' }).success).toBe(true);
  });
});

describe('evidence schema', () => {
  const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });
  const schema = (needsFile: boolean) => evidenceSchema({ today: '2026-09-10', needsFile });

  it('requires a date that is not in the future', () => {
    expect(errorsOf(schema(false).safeParse({ completedOn: '', reflection: '', file: null })).completedOn).toBe('Select the completion date');
    expect(errorsOf(schema(false).safeParse({ completedOn: '2026-09-11', reflection: '', file: null })).completedOn).toMatch(/future/);
  });

  it('requires a file only for certificate items without existing evidence', () => {
    expect(errorsOf(schema(true).safeParse({ completedOn: '2026-09-01', reflection: '', file: null })).file).toMatch(/Attach/);
    expect(schema(false).safeParse({ completedOn: '2026-09-01', reflection: '', file: null }).success).toBe(true);
  });

  it('rejects oversized and unsupported files', () => {
    const big = file('a.pdf', 'application/pdf', 16 * 1024 * 1024);
    expect(errorsOf(schema(true).safeParse({ completedOn: '2026-09-01', reflection: '', file: big })).file).toMatch(/15 MB/);
    const exe = file('a.exe', 'application/x-msdownload');
    expect(errorsOf(schema(true).safeParse({ completedOn: '2026-09-01', reflection: '', file: exe })).file).toMatch(/PNG/);
    expect(schema(true).safeParse({ completedOn: '2026-09-01', reflection: '', file: file('a.png', 'image/png') }).success).toBe(true);
  });

  it('limits the reflection length', () => {
    expect(errorsOf(schema(false).safeParse({ completedOn: '2026-09-01', reflection: 'x'.repeat(2001), file: null })).reflection).toMatch(/2000/);
  });
});

describe('learning item schema', () => {
  const valid: ItemFormValues = {
    title: '  GDPR  ',
    categoryId: '1',
    cpdTypeId: '2',
    deliveryTypeId: '3',
    provider: '',
    hours: '1.5',
    dueDate: '2026-04-30',
    isMandatory: 'yes',
    evidenceMode: 'certificate',
    link: '',
    description: '',
    all: false,
    designationIds: [4],
    profileIds: [],
  };

  it('accepts a valid item and converts it to the API shape', () => {
    const parsed = itemSchema.parse(valid);
    expect(toItemInput(parsed)).toEqual({
      title: 'GDPR',
      categoryId: 1,
      cpdTypeId: 2,
      deliveryTypeId: 3,
      provider: null,
      hours: 1.5,
      dueDate: '2026-04-30',
      isMandatory: true,
      evidenceMode: 'certificate',
      link: null,
      description: null,
      audience: { all: false, designationIds: [4], profileIds: [] },
    });
  });

  it('flags a missing title, bad hours, unsafe links and an empty audience', () => {
    const e = errorsOf(itemSchema.safeParse({ ...valid, title: ' ', hours: '0', link: 'javascript:alert(1)', designationIds: [] }));
    expect(Object.keys(e).sort()).toEqual(['designationIds', 'hours', 'link', 'title']);
    expect(errorsOf(itemSchema.safeParse({ ...valid, hours: '501' })).hours).toMatch(/500/);
  });

  it('clears designation/person targets when assigned to everyone', () => {
    const parsed = itemSchema.parse({ ...valid, all: true, designationIds: [4] });
    expect(toItemInput(parsed).audience).toEqual({ all: true, designationIds: [], profileIds: [] });
  });
});

describe('user schema', () => {
  const valid = {
    fullName: 'Grace Lin',
    email: 'glin@projectaccountants.co.uk',
    role: 'team_member' as const,
    designationId: '',
    lineManagerId: '',
    access: 'auto' as const,
    status: 'active' as const,
  };

  it('requires a name and a valid email', () => {
    expect(errorsOf(userSchema.safeParse({ ...valid, fullName: '', email: 'x' }))).toEqual({
      fullName: 'Enter a full name',
      email: 'Enter a valid email address',
    });
  });

  it('leaves access to the server default when "auto", and sends status only when editing', () => {
    expect(toPersonInput(userSchema.parse(valid), false)).toEqual({
      fullName: 'Grace Lin',
      email: 'glin@projectaccountants.co.uk',
      role: 'team_member',
      designationId: null,
      lineManagerId: null,
    });
    expect(toPersonInput(userSchema.parse({ ...valid, access: 'full', designationId: '3' }), true)).toMatchObject({
      designationId: 3,
      reportingAccess: 'full',
      status: 'active',
    });
  });
});

describe('period and year schemas', () => {
  it('requires "to" on or after "from"', () => {
    expect(errorsOf(periodSchema.safeParse({ from: '2026-09-30', to: '2026-01-01' })).to).toBe('Must be on or after From');
    expect(periodSchema.safeParse({ from: '', to: '' }).success).toBe(true);
    expect(Object.keys(errorsOf(requiredPeriodSchema.safeParse({ from: '', to: '' })))).toEqual(['from', 'to']);
  });

  it('rejects malformed and existing years', () => {
    const s = newYearSchema([2026]);
    expect(errorsOf(s.safeParse({ year: '26', copyFrom: '', makeCurrent: 'no' })).year).toMatch(/four-digit/);
    expect(errorsOf(s.safeParse({ year: '2026', copyFrom: '', makeCurrent: 'no' })).year).toMatch(/already exists/);
    expect(s.safeParse({ year: '2027', copyFrom: '', makeCurrent: 'no' }).success).toBe(true);
  });
});

describe('applyServerErrors', () => {
  it('maps server field errors (with aliases) onto known form fields only', () => {
    const setError = vi.fn();
    const err = new ApiError('Bad', 400, 'VALIDATION_ERROR', [
      { path: 'email', message: 'Taken' },
      { path: 'audience.designationIds', message: 'Unknown designation' },
      { path: 'somethingElse', message: 'ignored' },
    ]);
    expect(applyServerErrors(err, setError, ['email', 'designationIds'] as const, { audience: 'designationIds' })).toBe(true);
    expect(setError.mock.calls).toEqual([
      ['email', { type: 'server', message: 'Taken' }],
      ['designationIds', { type: 'server', message: 'Unknown designation' }],
    ]);
  });

  it('ignores non-API errors', () => {
    expect(applyServerErrors(new Error('x'), vi.fn(), ['email'] as const)).toBe(false);
  });
});
