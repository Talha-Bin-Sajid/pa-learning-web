import { config } from './config';

/** Error thrown for any non-2xx API response, carrying the backend's code and field details. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** First error message for a form field (e.g. 'email'). */
  fieldError(path: string): string | undefined {
    return this.details.find((d) => d.path === path)?.message;
  }
}

type TokenProvider = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

let getToken: TokenProvider = async () => null;
let onUnauthorized: UnauthorizedHandler = () => undefined;

/** Wired once by the AuthProvider. */
export function configureApi(tokenProvider: TokenProvider, unauthorized: UnauthorizedHandler): void {
  getToken = tokenProvider;
  onUnauthorized = unauthorized;
}

type Query = Record<string, string | number | boolean | null | undefined>;

function url(path: string, query?: Query): string {
  const u = new URL(`${config.apiUrl}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  return u.toString();
}

async function request(method: string, path: string, opts: { query?: Query; body?: unknown; form?: FormData; signal?: AbortSignal } = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(url(path, opts.query), { method, headers, body, signal: opts.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { message?: string; code?: string; details?: ApiError['details'] } | null;
    if (res.status === 401) onUnauthorized();
    throw new ApiError(payload?.message ?? `Request failed (${res.status}).`, res.status, payload?.code ?? 'HTTP_ERROR', payload?.details);
  }
  return res;
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const payload = (await res.json()) as { data: T };
  return payload.data;
}

export const api = {
  get: async <T>(path: string, query?: Query, signal?: AbortSignal) => json<T>(await request('GET', path, { query, signal })),
  post: async <T>(path: string, body?: unknown) => json<T>(await request('POST', path, { body })),
  put: async <T>(path: string, body?: unknown) => json<T>(await request('PUT', path, { body })),
  patch: async <T>(path: string, body?: unknown) => json<T>(await request('PATCH', path, { body })),
  delete: async (path: string) => json<void>(await request('DELETE', path)),
  upload: async <T>(method: 'POST' | 'PUT', path: string, form: FormData) => json<T>(await request(method, path, { form })),

  /** Downloads a generated file (Excel) and saves it with the server-provided name. */
  async download(path: string, query?: Query): Promise<void> {
    const res = await request('GET', path, { query });
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? 'download.xlsx';
    saveBlob(await res.blob(), name);
  },
};

export function saveBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
