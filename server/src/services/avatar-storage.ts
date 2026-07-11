import { getSupabase } from '../db.js';

const BUCKET = 'avatars';
const MAX_BYTES = 1_500_000;

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ParsedAvatarUpload {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/** Valida e decodifica um data URL de imagem (jpeg/png/webp, até 1,5MB). */
export function parseAvatarDataUrl(dataUrl: unknown): ParsedAvatarUpload | { error: string } {
  if (typeof dataUrl !== 'string') return { error: 'Imagem inválida.' };
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return { error: 'Formato de imagem não suportado (use JPEG, PNG ou WebP).' };

  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength === 0) return { error: 'Imagem vazia.' };
  if (buffer.byteLength > MAX_BYTES) {
    return { error: 'Imagem muito grande (máx. 1,5MB após compressão).' };
  }

  return { buffer, contentType, extension: ALLOWED_MIME[contentType] };
}

/** Sobe a foto de perfil e retorna a URL pública (com cache-buster). */
export async function uploadAvatar(userId: string, upload: ParsedAvatarUpload): Promise<string> {
  const sb = getSupabase();
  const path = `${userId}.${upload.extension}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, upload.buffer, {
    contentType: upload.contentType,
    upsert: true,
  });
  if (error) throw new Error(`Falha no upload da foto: ${error.message}`);

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatar(userId: string): Promise<void> {
  const sb = getSupabase();
  const paths = Object.values(ALLOWED_MIME).map((ext) => `${userId}.${ext}`);
  await sb.storage.from(BUCKET).remove(paths);
}
