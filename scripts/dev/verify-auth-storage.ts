/**
 * Valida persistência de sessão e email salvo (auth-storage).
 * Rode: npx tsx scripts/dev/verify-auth-storage.ts
 */
import assert from 'node:assert/strict';

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

(globalThis as { localStorage: Storage; sessionStorage: Storage }).localStorage =
  mockStorage('local');
(globalThis as { localStorage: Storage; sessionStorage: Storage }).sessionStorage =
  mockStorage('session');

const { setToken, getToken, clearToken, getSavedEmail, setSavedEmail } =
  await import('../../client/src/lib/auth-storage.ts');

function reset() {
  localStorage.clear();
  sessionStorage.clear();
}

reset();
assert.equal(getToken(), null);
assert.equal(getSavedEmail(), null);

setToken('jwt-persist');
setSavedEmail('hero@test.com');
assert.equal(getToken(), 'jwt-persist');
assert.equal(localStorage.getItem('abdoria_token'), 'jwt-persist');
assert.equal(sessionStorage.getItem('abdoria_token'), null);
assert.equal(getSavedEmail(), 'hero@test.com');

clearToken();
assert.equal(getToken(), null, 'logout clears token');
assert.equal(getSavedEmail(), 'hero@test.com', 'logout keeps saved email');

reset();
sessionStorage.setItem('abdoria_token', 'jwt-legacy-session');
assert.equal(getToken(), 'jwt-legacy-session', 'migrates sessionStorage token');
assert.equal(localStorage.getItem('abdoria_token'), 'jwt-legacy-session');
assert.equal(sessionStorage.getItem('abdoria_token'), null);

reset();
localStorage.setItem('abdoria_remember', '0');
localStorage.setItem('abdoria_saved_email', 'stale@test.com');
assert.equal(getSavedEmail(), 'stale@test.com', 'saved email no longer depends on remember flag');
setToken('jwt-new');
assert.equal(localStorage.getItem('abdoria_remember'), null, 'legacy remember flag is cleared');

console.log('Auth storage verification OK');
