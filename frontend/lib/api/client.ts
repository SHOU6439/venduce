const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function resolveUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function ensureHeaders(existing: HeadersInit | undefined, required: Record<string, string>): Headers {
  const headers = new Headers(existing ?? undefined);

  Object.entries(required).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return headers;
}

function stripBody(init?: RequestInit): RequestInit | undefined {
  if (!init || init.body === undefined) {
    return init;
  }

  const sanitizedInit: RequestInit = { ...init };
  delete sanitizedInit.body;
  return sanitizedInit;
}

async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const headers = ensureHeaders(init.headers, { Accept: 'application/json' });

  const response = await fetch(resolveUrl(path), {
    ...init,
    headers,
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const fallbackMessage = response.statusText || 'Request failed';
    let message = fallbackMessage;

    if (typeof payload === 'object' && payload !== null) {
      if ('detail' in payload) {
        const detail = (payload as Record<string, unknown>).detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          // Handle Pydantic validation errors
          message = detail.map((err) => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof detail === 'object' && detail !== null) {
          // Handle structured error objects
          message = String((detail as Record<string, unknown>).message) || JSON.stringify(detail);
        } else {
          message = String(detail);
        }
      } else if ('message' in payload) {
        message = String((payload as Record<string, unknown>).message);
      }
    }

    throw new ApiError(response.status, message, payload);
  }

  return payload as TResponse;
}

function withJsonBody(init: RequestInit, body?: unknown): RequestInit {
  if (body === undefined) {
    return init;
  }

  const headers = ensureHeaders(init.headers, { 'Content-Type': 'application/json' });

  return {
    ...init,
    headers,
    body: JSON.stringify(body),
  } satisfies RequestInit;
}

export interface ApiClient {
  request<TResponse>(path: string, init?: RequestInit): Promise<TResponse>;
  get<TResponse>(path: string, init?: RequestInit): Promise<TResponse>;
  post<TResponse>(path: string, body?: unknown, init?: RequestInit): Promise<TResponse>;
  put<TResponse>(path: string, body?: unknown, init?: RequestInit): Promise<TResponse>;
  patch<TResponse>(path: string, body?: unknown, init?: RequestInit): Promise<TResponse>;
  delete<TResponse>(path: string, init?: RequestInit): Promise<TResponse>;
}

async function send<TResponse>(method: HttpMethod, path: string, body?: unknown, init: RequestInit = {}): Promise<TResponse> {
  const preparedInit = withJsonBody(init, body);

  return request<TResponse>(path, {
    ...preparedInit,
    method,
  });
}

export const apiClient: ApiClient = {
  request,
  get: (path, init) => {
    const rest = stripBody(init);
    return request(path, { ...(rest ?? {}), method: 'GET' });
  },
  post: (path, body, init) => send('POST', path, body, init),
  put: (path, body, init) => send('PUT', path, body, init),
  patch: (path, body, init) => send('PATCH', path, body, init),
  delete: (path, init) => {
    const rest = stripBody(init);
    return request(path, { ...(rest ?? {}), method: 'DELETE' });
  },
};
