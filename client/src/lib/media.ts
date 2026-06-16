/** URL pública de mídia de exercício no diretório estático do Vite. */
export const exerciseMediaUrl = (slug: string, ext: 'gif' | 'mp4' = 'gif') =>
  `/media/exercises/${slug}.${ext}`;

export const exerciseGifUrl = (filename: string) => `/media/exercises/${filename}`;
