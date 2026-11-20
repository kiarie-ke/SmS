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

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
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
    status: response.status,
    headers: response.headers,
  } as T;
}
