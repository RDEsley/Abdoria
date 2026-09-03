const TOKEN_KEY = 'abdoria_token';
const EMAIL_KEY = 'abdoria_saved_email';
/** Legado do checkbox "Lembrar de mim" — só limpamos, não lemos mais. */
const LEGACY_REMEMBER_KEY = 'abdoria_remember';

export function setToken(token: string): void {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_REMEMBER_KEY);
}

export function getToken(): string | null {
  const persistent = localStorage.getItem(TOKEN_KEY);
  if (persistent) return persistent;
  // Sessões antigas em sessionStorage (remember=false) ainda hidratam uma vez.
  const ephemeral = sessionStorage.getItem(TOKEN_KEY);
  if (ephemeral) {
    localStorage.setItem(TOKEN_KEY, ephemeral);
    sessionStorage.removeItem(TOKEN_KEY);
    return ephemeral;
  }
  return null;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Último email usado neste aparelho — independente da sessão. */
export function getSavedEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function setSavedEmail(email: string | null): void {
  if (email) localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  else localStorage.removeItem(EMAIL_KEY);
}
