/**
 * Censura de palavrões (PT + EN) para textos visíveis publicamente
 * (ex.: descrição do perfil). Substitui a palavra inteira por asteriscos,
 * preservando o restante do texto.
 */
const BAD_WORDS = [
  // pt-BR
  'merda',
  'bosta',
  'caralho',
  'krl',
  'porra',
  'puta',
  'puto',
  'putaria',
  'foda',
  'fodase',
  'foda-se',
  'foder',
  'fodido',
  'fodida',
  'buceta',
  'boceta',
  'cu',
  'cuzao',
  'cuzão',
  'arrombado',
  'arrombada',
  'viado',
  'baitola',
  'fdp',
  'vsf',
  'pqp',
  'vtnc',
  'tnc',
  'cacete',
  'desgraçado',
  'desgraçada',
  'corno',
  'vagabunda',
  'vagabundo',
  // en
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'dick',
  'pussy',
  'cunt',
  'bastard',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'retard',
] as const;

function escapeRegex(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const PROFANITY_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${BAD_WORDS.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);

/** Substitui cada palavrão por asteriscos do mesmo tamanho. */
export function censorProfanity(text: string): string {
  return text.replace(PROFANITY_PATTERN, (match) => '*'.repeat(match.length));
}

export function hasProfanity(text: string): boolean {
  PROFANITY_PATTERN.lastIndex = 0;
  return PROFANITY_PATTERN.test(text);
}
