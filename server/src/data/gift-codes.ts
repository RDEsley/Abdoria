export interface GiftCodeDefinition {
  code: string;
  xp: number;
  abdoria: number;
  desbloqueia: string[];
  titulo_equipar?: string;
  mensagem: string;
  /** Se false, o código não pode mais ser resgatado. */
  active?: boolean;
  /** Data limite ISO (America/Sao_Paulo, inclusive até o fim do dia). */
  expires_at?: string;
}

export const GIFT_CODES: GiftCodeDefinition[] = [
  {
    code: 'abdoria',
    xp: 10_000,
    abdoria: 999,
    desbloqueia: ['titulo_eu_sou_heroi'],
    titulo_equipar: 'titulo_eu_sou_heroi',
    mensagem: 'Código Abdoria resgatado! Você recebeu 10.000 XP, 999 Abdoria e o título Eu sou herói.',
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
  return definition.xp > 0 || definition.abdoria > 0 || definition.desbloqueia.length > 0;
}
