export interface GiftCodeDefinition {
  code: string;
  xp: number;
  abdoria: number;
  desbloqueia: string[];
  titulo_equipar?: string;
  mensagem: string;
}

export const GIFT_CODES: GiftCodeDefinition[] = [
  {
    code: 'abdoria',
    xp: 15,
    abdoria: 15,
    desbloqueia: ['titulo_eu_sou_heroi'],
    titulo_equipar: 'titulo_eu_sou_heroi',
    mensagem: 'Código Abdoria resgatado! +15 XP, +15 Abdoria e título Eu sou herói.',
  },
];

export const GIFT_CODE_BY_KEY = Object.fromEntries(
  GIFT_CODES.map((entry) => [entry.code.toLowerCase(), entry]),
) as Record<string, GiftCodeDefinition>;
