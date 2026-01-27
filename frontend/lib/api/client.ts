const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function getStoredToken(explicitToken?: string | null): string | null {
  if (explicitToken) {
    return explicitToken;
  }
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("token");
}

function resolveUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
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

function ensureHeaders(
  existing: HeadersInit | undefined,
  required: Record<string, string>,
): Headers {
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

async function request<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers = ensureHeaders(init.headers, { Accept: "application/json" });
  if (!headers.has("Authorization")) {
    const token = getStoredToken(null);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(resolveUrl(path), {
    ...init,
    headers,
    credentials: "include", // ← 追加
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
    const fallbackMessage = response.statusText || "Request failed";
    let message = fallbackMessage;

    if (typeof payload === "object" && payload !== null) {
      if ("detail" in payload) {
        const detail = (payload as Record<string, unknown>).detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((err) => err.msg || JSON.stringify(err))
            .join(", ");
        } else if (typeof detail === "object" && detail !== null) {
          message =
            String((detail as Record<string, unknown>).message) ||
            JSON.stringify(detail);
        } else {
          message = String(detail);
        }
      } else if ("message" in payload) {
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

  const headers = ensureHeaders(init.headers, {
    "Content-Type": "application/json",
  });

  return {
    ...init,
    headers,
    body: JSON.stringify(body),
  } satisfies RequestInit;
}

export interface ApiClient {
  request<TResponse>(path: string, init?: RequestInit): Promise<TResponse>;
  get<TResponse>(path: string, init?: RequestInit): Promise<TResponse>;
  post<TResponse>(
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<TResponse>;
  put<TResponse>(
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<TResponse>;
  patch<TResponse>(
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<TResponse>;
  delete<TResponse>(path: string, init?: RequestInit): Promise<TResponse>;
}

async function send<TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  init: RequestInit = {},
): Promise<TResponse> {
  const preparedInit = withJsonBody(init, body);

  return request<TResponse>(path, {
    ...preparedInit,
    method,
  });
}

type RequestOptions = RequestInit & {
  token?: string;
};

async function fetchAPI<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, body, ...customConfig } = options as RequestInit & {
    token?: string;
  };
  const resolvedBody =
    body instanceof FormData || typeof body === "string"
      ? body
      : body !== undefined
        ? JSON.stringify(body)
        : undefined;

  const mergedHeaders = new Headers(headers ?? undefined);
  if (
    !(resolvedBody instanceof FormData) &&
    !mergedHeaders.has("Content-Type")
  ) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const authToken = getStoredToken(token ?? null);
  if (authToken && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(resolveUrl(endpoint), {
    ...customConfig,
    body: resolvedBody,
    headers: mergedHeaders,
    credentials: "include", // ← 追加
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorBody.detail || `API Error: ${response.statusText}`,
      errorBody,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiClient: ApiClient = {
  request,
  get: (path, init) => {
    const rest = stripBody(init);
    return request(path, { ...(rest ?? {}), method: "GET" });
  },
  post: (path, body, init) => send("POST", path, body, init),
  put: (path, body, init) => send("PUT", path, body, init),
  patch: (path, body, init) => send("PATCH", path, body, init),
  delete: (path, init) => {
    const rest = stripBody(init);
    return request(path, { ...(rest ?? {}), method: "DELETE" });
  },
};

export const client = {
  get: <T>(url: string, options?: RequestOptions) =>
    fetchAPI<T>(url, { ...options, method: "GET" }),
  post: <T>(url: string, body?: any, options?: RequestOptions) =>
    fetchAPI<T>(url, { ...options, method: "POST", body }),
  put: <T>(url: string, body?: any, options?: RequestOptions) =>
    fetchAPI<T>(url, { ...options, method: "PUT", body }),
  patch: <T>(url: string, body?: any, options?: RequestOptions) =>
    fetchAPI<T>(url, { ...options, method: "PATCH", body }),
  delete: <T>(url: string, options?: RequestOptions) =>
    fetchAPI<T>(url, { ...options, method: "DELETE" }),
};
