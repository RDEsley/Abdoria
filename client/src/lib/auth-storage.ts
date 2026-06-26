const TOKEN_KEY = 'abdoria_token';
const REMEMBER_KEY = 'abdoria_remember';
const EMAIL_KEY = 'abdoria_saved_email';

export function setToken(token: string, remember = true): void {
  clearToken();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Último login manteve sessão persistente (localStorage). */
export function isRememberMeEnabled(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

/** Preferência do checkbox na tela de login (padrão: marcado na 1ª visita). */
export function getRememberMePreference(): boolean {
  const stored = localStorage.getItem(REMEMBER_KEY);
  if (stored === '0') return false;
  return true;
}

export function getSavedEmail(): string | null {
  if (!isRememberMeEnabled()) return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function setSavedEmail(email: string | null): void {
  if (email) localStorage.setItem(EMAIL_KEY, email);
  else localStorage.removeItem(EMAIL_KEY);
}
