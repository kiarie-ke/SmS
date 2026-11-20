import { getAccessToken } from './auth-token';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code = 'HTTP_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiErrorBody;
}

/**
 * Paginated lists keep their metadata on the envelope (`{ data, meta }`), so
 * it is not part of the Orval response type. This reads it back safely.
 */
export function getPaginationMeta(response: unknown): PaginationMeta | undefined {
  const meta = (response as { meta?: PaginationMeta } | null)?.meta;
  return meta && typeof meta === 'object' ? meta : undefined;
}

/**
 * Orval mutator: adds the API origin, sends cookies, unwraps the
 * `{ success, data }` envelope and throws ApiError on failure.
 */
export async function httpClient<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  // Let the browser set the multipart boundary for FormData bodies.
  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  } else if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  // Orval's fetch client types responses as { data, status, headers }.
  return {
    data: payload.data,
    meta: payload.meta,
    status: response.status,
    headers: response.headers,
  } as T;
}
