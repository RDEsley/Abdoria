import type { UserMutable } from '../repositories/user-repository.js';

/** Sem 0/O/1/I para a tag ser fácil de ler e ditar. */
const TAG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TAG_LENGTH = 4;
const MAX_ATTEMPTS = 10;

function randomTag(): string {
  let tag = '';
  for (let i = 0; i < TAG_LENGTH; i += 1) {
    tag += TAG_ALPHABET[Math.floor(Math.random() * TAG_ALPHABET.length)];
  }
  return tag;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

/**
 * Garante que o usuário tem uma tag única (#A7K2). Contas antigas ganham a
 * tag na primeira leitura do /me; colisões são resolvidas por retry — o
 * índice único do banco é a fonte de verdade.
 */
export async function ensureUserTag(user: UserMutable): Promise<string | null> {
  if (user.tag) return user.tag;
  // Coluna ainda não migrada: `tag` vem como undefined e o save a omitiria,
  // mas atribuir dispararia erro de coluna inexistente — não tenta.
  if (user.tag === undefined) return null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    user.tag = randomTag();
    try {
      await user.save();
      return user.tag;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      user.tag = null;
    }
  }
  return null;
}
