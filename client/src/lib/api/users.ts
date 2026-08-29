import type {
  IUserDocument,
  AbTrainingProfileV2,
  MolduraId,
  OnboardingPayload,
  PerfilTreino,
  PublicProfile,
  UpdateUserDadosResponse,
  UserPreferencias,
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

export function getPublicProfile(userId: string): Promise<PublicProfile> {
  return fetchJson(`/users/${userId}/public`);
}

export function updateMe(data: Partial<IUserDocument>): Promise<IUserDocument> {
  return fetchJson('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}

/** Atualiza somente as preferências informadas; o servidor faz o merge com o perfil atual. */
export function updatePreferences(preferencias: Partial<UserPreferencias>): Promise<IUserDocument> {
  return fetchJson('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ preferencias }),
  });
}

export function updateUserDados(data: Partial<UserDadosSalvos>): Promise<UpdateUserDadosResponse> {
  return fetchJson('/users/me/dados', { method: 'PATCH', body: JSON.stringify(data) });
}

export function completeOnboarding(data: OnboardingPayload): Promise<IUserDocument> {
  return fetchJson('/users/me/onboarding', { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateTrainingProfile(
  perfil: Omit<PerfilTreino, 'atualizado_em'>,
  equipamentos?: UserPreferencias['equipamentos'],
): Promise<IUserDocument> {
  return fetchJson('/users/me/training-profile', {
    method: 'PUT',
    body: JSON.stringify({ perfil_treino: perfil, equipamentos }),
  });
}

export function updateAbTrainingProfileV2(profile: AbTrainingProfileV2): Promise<IUserDocument> {
  return fetchJson('/users/me/ab-training-profile-v2', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });
}

export function regenerateTrainingPlan(): Promise<IUserDocument> {
  return fetchJson('/users/me/training-plan/regenerate', { method: 'POST' });
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

/** Apaga a conta em definitivo — sem volta. */
export function deleteAccount(): Promise<{ ok: boolean }> {
  return fetchJson('/users/me', { method: 'DELETE' });
}

/** Concluir um Lembrete — XP fixo, sem toast próprio (ver shared/bloco-notas). */
export function grantLembreteXp(): Promise<{ user: IUserDocument; xp_ganho: number }> {
  return fetchJson('/users/me/lembrete-xp', { method: 'POST' });
}

export function getMolduraStatus(): Promise<MolduraStatusResponse> {
  return fetchJson('/users/me/molduras');
}

export function equipMoldura(moldura: MolduraId | null): Promise<{ user: IUserDocument }> {
  return fetchJson('/users/me/moldura', { method: 'POST', body: JSON.stringify({ moldura }) });
}
