import type {
  IUserDocument,
  OnboardingPayload,
  UpdateUserDadosResponse,
  UserDadosSalvos,
} from '@/types';
import { fetchJson } from './client';

export function getMe(): Promise<IUserDocument> {
  return fetchJson('/users/me');
}

export function updateMe(data: Partial<IUserDocument>): Promise<IUserDocument> {
  return fetchJson('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateUserDados(data: Partial<UserDadosSalvos>): Promise<UpdateUserDadosResponse> {
  return fetchJson('/users/me/dados', { method: 'PATCH', body: JSON.stringify(data) });
}

export function completeOnboarding(data: OnboardingPayload): Promise<IUserDocument> {
  return fetchJson('/users/me/onboarding', { method: 'PATCH', body: JSON.stringify(data) });
}
