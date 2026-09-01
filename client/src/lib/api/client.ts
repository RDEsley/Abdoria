import { getToken, clearToken } from '@/lib/auth-storage';
import { mapHttpStatus, toApiError } from '@/lib/api-errors';

function resolveApiBase(configuredBase: string | undefined): string {
  const base = configuredBase?.trim().replace(/\/+$/, '');
  if (!base) return '/api';
  return base.endsWith('/api') ? base : `${base}/api`;
}

const API_BASE = resolveApiBase(import.meta.env.VITE_API_BASE_URL);
const REQUEST_TIMEOUT_MS = 20_000;

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('abdoria:unauthorized'));
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const serverMessage = (body as { error?: string }).error;
      throw mapHttpStatus(response.status, serverMessage);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}
