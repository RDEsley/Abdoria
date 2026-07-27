import { CURRENCY_NAME } from '../types/index.js';

export interface GiftCodeDefinition {
  code: string;
  xp: number;
  abdoria: number;
  desbloqueia: string[];
  titulo_equipar?: string;
  mensagem: string;
  /** Frozen Streaks concedidos direto no inventário. */
  frozen_streaks?: number;
  /** Gemas (moeda premium) concedidas direto na conta. */
  gems?: number;
  /** true = desbloqueia todas as entradas do Bestiário de uma vez. */
  unlock_bestiary?: boolean;
  /** Se false, o código não pode mais ser resgatado. */
  active?: boolean;
  /** Data limite ISO (America/Sao_Paulo, inclusive até o fim do dia). */
  expires_at?: string;
}

export const GIFT_CODES: GiftCodeDefinition[] = [
  {
    code: 'abdoria',
    xp: 0,
    abdoria: 999,
    desbloqueia: [],
    mensagem: `Código Abdoria resgatado! Você recebeu 999 ${CURRENCY_NAME}.`,
    active: true,
  },
  {
    code: 'discord',
    xp: 0,
    abdoria: 1000,
    frozen_streaks: 7,
    gems: 1,
    desbloqueia: ['titulo_membro_familia'],
    titulo_equipar: 'titulo_membro_familia',
    mensagem: 'Bem-vindo à família Abdoria! Recompensa exclusiva do Discord resgatada.',
    active: true,
  },
  {
    code: 'hexa2026',
    xp: 0,
    abdoria: 0,
    desbloqueia: ['fundo_brasil'],
    mensagem: 'Hexa! Banner Brasil desbloqueado — vista as cores da torcida no seu perfil.',
    active: true,
  },
  {
    code: 'slimesss',
    xp: 0,
    abdoria: 0,
    desbloqueia: [],
    unlock_bestiary: true,
    mensagem: 'Bestiário completo desbloqueado! Todos os slimes já aparecem no seu catálogo.',
    active: true,
  },
];

export const GIFT_CODE_BY_KEY = Object.fromEntries(
  GIFT_CODES.map((entry) => [entry.code.toLowerCase(), entry]),
) as Record<string, GiftCodeDefinition>;

export function isGiftCodeExpired(definition: GiftCodeDefinition, todaySaoPaulo: string): boolean {
  if (!definition.expires_at) return false;
  return todaySaoPaulo > definition.expires_at;
}

export function hasGiftCodeRewards(definition: GiftCodeDefinition): boolean {
  return (
    definition.xp > 0 ||
    definition.abdoria > 0 ||
    definition.desbloqueia.length > 0 ||
    (definition.frozen_streaks ?? 0) > 0 ||
    (definition.gems ?? 0) > 0 ||
    definition.unlock_bestiary === true
  );
}
