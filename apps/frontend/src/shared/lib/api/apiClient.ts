import { ApiClientError, type ApiError, type ApiResponse } from '@/shared/types/api';

const DEFAULT_API_URL = 'http://localhost:4000/api/v1';

export const REAUTH_PATH = '/login?reauth=1';

export const getBaseUrl = () => {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  const baseUrl = rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : DEFAULT_API_URL;
  return baseUrl.replace(/\/$/, '');
};

const createHeaders = (headers?: HeadersInit, hasBody?: boolean) => {
  const requestHeaders = new Headers(headers);

  if (hasBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  return requestHeaders;
};

const parseJson = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
};

const redirectToReauth = () => {
  if (typeof window !== 'undefined') {
    window.location.href = REAUTH_PATH;
  }
};

const refreshAccessToken = async () => {
  const response = await fetch(`${getBaseUrl()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const parsed = await parseJson<ApiResponse<{ message: string }>>(response);
    const error = parsed && !parsed.success ? parsed.error : createFallbackError(response.status);
    throw new ApiClientError(error, response.status);
  }
};

const createFallbackError = (status: number): ApiError => ({
  code: 'SERVER_INTERNAL_ERROR',
  message: `Request failed with status ${status}`,
});

const request = async <T>(
  url: string,
  options: RequestInit = {},
  hasRetried = false,
): Promise<T> => {
  const response = await fetch(`${getBaseUrl()}${url}`, {
    ...options,
    credentials: 'include',
    headers: createHeaders(options.headers, options.body !== undefined),
  });

  const parsed = await parseJson<ApiResponse<T>>(response);

  if (response.status === 401 && parsed && !parsed.success) {
    const shouldRefresh =
      parsed.error.code === 'AUTH_UNAUTHORIZED' || parsed.error.code === 'AUTH_TOKEN_EXPIRED';

    if (shouldRefresh && !hasRetried) {
      try {
        await refreshAccessToken();
      } catch (error) {
        if (error instanceof ApiClientError && error.code === 'AUTH_REFRESH_EXPIRED') {
          redirectToReauth();
        }
        throw error;
      }
      return request<T>(url, options, true);
    }

    if (hasRetried) {
      redirectToReauth();
    }
  }

  if (!response.ok) {
    const error = parsed && !parsed.success ? parsed.error : createFallbackError(response.status);
    throw new ApiClientError(error, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!parsed?.success) {
    throw new ApiClientError(createFallbackError(response.status), response.status);
  }

  return parsed.data;
};

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(url: string) =>
    request<T>(url, {
      method: 'DELETE',
    }),
};
