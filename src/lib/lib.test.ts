import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, configureApi } from './api-client';
import { downloadCsv } from './csv';
import { formatDate, formatHours } from './format';

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('sends the bearer token and unwraps the success envelope', async () => {
    configureApi(
      async () => 'tok',
      () => undefined,
    );
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ok: 1 } }), { status: 200 }));
    await expect(api.get('/me', { cycleId: 'abc', empty: '' })).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/me\?cycleId=abc$/);
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('turns error envelopes into ApiError with field details', async () => {
    configureApi(
      async () => 'tok',
      () => undefined,
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: 'Bad',
          code: 'VALIDATION_ERROR',
          details: [{ path: 'email', message: 'Invalid' }],
        }),
        { status: 400 },
      ),
    );
    const err = (await api.post('/x', {}).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.fieldError('email')).toBe('Invalid');
  });

  it('signs out on 401', async () => {
    const onUnauthorized = vi.fn();
    configureApi(async () => 'expired', onUnauthorized);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: 'x', code: 'INVALID_TOKEN' }), { status: 401 }),
    );
    await expect(api.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('reports network failures in plain words', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.get('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('csv export', () => {
  it('escapes quotes/commas and neutralises formula injection', async () => {
    let captured: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      captured = b as Blob;
      return 'blob:x';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    downloadCsv('x.csv', [
      ['Name', 'Note'],
      ['Grace "G" Lin', '=HYPERLINK("http://evil")'],
      ['A, B', 3],
    ]);
    const text = await captured!.text();
    expect(text).toContain('"Grace ""G"" Lin"');
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(text).toContain('"A, B",3');
  });
});

describe('format', () => {
  it('formats UK dates and hours', () => {
    expect(formatDate('2026-03-31')).toBe('31 Mar 2026');
    expect(formatDate(null)).toBe('-');
    expect(formatHours(1.5)).toBe('1.5 h');
    expect(formatHours(2)).toBe('2 h');
  });
});
