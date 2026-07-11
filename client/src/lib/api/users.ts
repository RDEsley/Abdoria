import type {
  IUserDocument,
  MolduraId,
  OnboardingPayload,
  UpdateUserDadosResponse,
  UserDadosSalvos,
} from '@/types';
import { fetchJson } from './client';

export interface MolduraStatusResponse {
  first: number;
  second: number;
  third: number;
  secret_items: number;
  desbloqueadas: MolduraId[];
  equipada: MolduraId | null;
}

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

export function changeName(nome: string): Promise<{ user: IUserDocument; custo_pago: number }> {
  return fetchJson('/users/me/name', { method: 'POST', body: JSON.stringify({ nome }) });
}

export function uploadProfilePhoto(dataUrl: string): Promise<{ user: IUserDocument }> {
  return fetchJson('/users/me/avatar', {
    method: 'POST',
    body: JSON.stringify({ data_url: dataUrl }),
  });
}

export function removeProfilePhoto(): Promise<{ user: IUserDocument }> {
  return fetchJson('/users/me/avatar', { method: 'DELETE' });
}

export function getMolduraStatus(): Promise<MolduraStatusResponse> {
  return fetchJson('/users/me/molduras');
}

export function equipMoldura(moldura: MolduraId | null): Promise<{ user: IUserDocument }> {
  return fetchJson('/users/me/moldura', { method: 'POST', body: JSON.stringify({ moldura }) });
}
