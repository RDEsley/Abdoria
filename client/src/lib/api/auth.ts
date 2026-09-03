import type { AuthResponse } from '@/types';
import { fetchJson } from './client';

export function login(email: string, password: string): Promise<AuthResponse> {
  return fetchJson('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return fetchJson('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export function register(email: string, password: string, nome: string): Promise<AuthResponse> {
  return fetchJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, nome }),
  });
}

export function logoutApi(): Promise<{ ok: boolean }> {
  return fetchJson('/auth/logout', { method: 'POST' });
}
