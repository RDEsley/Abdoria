/**
 * Valida lógica de "Lembrar de mim" (auth-storage).
 * Rode: npx tsx scripts/dev/verify-remember-me.ts
 */
import assert from 'node:assert/strict';

// Simula localStorage/sessionStorage em memória para o teste
const stores = new Map<string, Map<string, string>>();
function mockStorage(name: string): Storage {
  if (!stores.has(name)) stores.set(name, new Map());
  const map = stores.get(name)!;
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

(globalThis as { localStorage: Storage; sessionStorage: Storage }).localStorage = mockStorage('local');
(globalThis as { localStorage: Storage; sessionStorage: Storage }).sessionStorage = mockStorage('session');

const {
  setToken,
  getToken,
  clearToken,
  isRememberMeEnabled,
  getRememberMePreference,
  getSavedEmail,
  setSavedEmail,
} = await import('../../client/src/lib/auth-storage.ts');

function reset() {
  localStorage.clear();
  sessionStorage.clear();
}

reset();
assert.equal(getRememberMePreference(), true, 'first visit defaults checkbox to checked');
assert.equal(getSavedEmail(), null, 'no saved email on first visit');

setToken('jwt-remember', true);
setSavedEmail('hero@test.com');
assert.equal(getToken(), 'jwt-remember');
assert.equal(localStorage.getItem('abdoria_token'), 'jwt-remember');
assert.equal(sessionStorage.getItem('abdoria_token'), null);
assert.ok(isRememberMeEnabled());
assert.equal(getSavedEmail(), 'hero@test.com');
assert.equal(getRememberMePreference(), true);

clearToken();
assert.equal(getToken(), null, 'logout clears token');
assert.ok(isRememberMeEnabled(), 'logout keeps remember preference');
assert.equal(getSavedEmail(), 'hero@test.com', 'logout keeps saved email');

reset();
setToken('jwt-session', false);
setSavedEmail(null);
assert.equal(getToken(), 'jwt-session');
assert.equal(sessionStorage.getItem('abdoria_token'), 'jwt-session');
assert.equal(localStorage.getItem('abdoria_token'), null);
assert.equal(isRememberMeEnabled(), false);
assert.equal(getRememberMePreference(), false);
assert.equal(getSavedEmail(), null);

reset();
localStorage.setItem('abdoria_remember', '0');
assert.equal(getRememberMePreference(), false);
localStorage.setItem('abdoria_saved_email', 'stale@test.com');
assert.equal(getSavedEmail(), null, 'email hidden when remember is off');

console.log('Remember-me verification OK');
