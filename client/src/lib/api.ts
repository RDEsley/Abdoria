import type {
  AuthResponse,
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
  DashboardStats,
  ExerciseFilters,
  IExerciseDocument,
  IUserDocument,
  IWorkoutHistoryDocument,
  IWorkoutPresetDocument,
  LeaderboardEntry,
  OnboardingPayload,
  MusculoPrincipal,
} from '@/types';
import { getToken, clearToken } from '@/lib/auth-storage';
import { ApiError, mapHttpStatus, toApiError } from '@/lib/api-errors';

const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 20_000;

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
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

export function login(email: string, password: string): Promise<AuthResponse> {
  return fetchJson('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function loginAsGuest(): Promise<AuthResponse> {
  return fetchJson('/auth/guest', { method: 'POST' });
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return fetchJson('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export function register(email: string, password: string, nome: string): Promise<AuthResponse> {
  return fetchJson('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, nome }) });
}

export function logoutApi(): Promise<{ ok: boolean }> {
  return fetchJson('/auth/logout', { method: 'POST' });
}

export function getExercises(filters: ExerciseFilters = {}): Promise<IExerciseDocument[]> {
  const params = new URLSearchParams();
  if (filters.musculo) params.set('musculo', filters.musculo);
  if (filters.nivel !== undefined) params.set('nivel', String(filters.nivel));
  if (filters.prioridade) params.set('prioridade', filters.prioridade);
  const query = params.toString();
  return fetchJson(`/exercises${query ? `?${query}` : ''}`);
}

export function getMe(): Promise<IUserDocument> {
  return fetchJson('/users/me');
}

export function updateMe(data: Partial<IUserDocument>): Promise<IUserDocument> {
  return fetchJson('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}

export function completeOnboarding(data: OnboardingPayload): Promise<IUserDocument> {
  return fetchJson('/users/me/onboarding', { method: 'PATCH', body: JSON.stringify(data) });
}

export function getDashboardStats(): Promise<DashboardStats> {
  return fetchJson('/workouts/stats');
}

export function getWorkoutHistory(): Promise<IWorkoutHistoryDocument[]> {
  return fetchJson('/workouts/history');
}

export function completeWorkout(payload: CompleteWorkoutPayload): Promise<CompleteWorkoutResponse> {
  return fetchJson('/workouts/complete', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPresets(): Promise<IWorkoutPresetDocument[]> {
  return fetchJson('/presets');
}

export function getRecommendedPresets(): Promise<IWorkoutPresetDocument[]> {
  return fetchJson('/presets/recommended');
}

export function getPreset(id: string): Promise<IWorkoutPresetDocument> {
  return fetchJson(`/presets/${id}`);
}

export function getLeaderboard(metric: 'xp' | 'streak' = 'xp'): Promise<LeaderboardEntry[]> {
  return fetchJson(`/leaderboard?metric=${metric}&limit=50`);
}

export function getMyLeaderboardRank(metric: 'xp' | 'streak' = 'xp'): Promise<LeaderboardEntry> {
  return fetchJson(`/leaderboard/me?metric=${metric}`);
}

export interface HealthResponse {
  status: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export function getHealth(): Promise<HealthResponse> {
  return fetchJson('/health');
}

export type { MusculoPrincipal, ApiError };
