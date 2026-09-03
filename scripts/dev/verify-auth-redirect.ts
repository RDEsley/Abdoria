/**
 * Valida redirects pós-login/cadastro.
 * Rode: npx tsx scripts/dev/verify-auth-redirect.ts
 */
import assert from 'node:assert/strict';
import { readAuthFromState, resolvePostAuthPath } from '../../client/src/lib/auth-redirect.ts';

assert.equal(resolvePostAuthPath(undefined, false), '/onboarding');
assert.equal(resolvePostAuthPath({ pathname: '/perfil/abc' }, false), '/onboarding');
assert.equal(resolvePostAuthPath({ pathname: '/perfil/abc' }, true), '/perfil/abc');
assert.equal(
  resolvePostAuthPath({ pathname: '/perfil/abc', search: '?x=1' }, true),
  '/perfil/abc?x=1',
);
assert.equal(resolvePostAuthPath({ pathname: '/login' }, true), '/');
assert.equal(resolvePostAuthPath({ pathname: '/welcome' }, true), '/');
assert.equal(resolvePostAuthPath({ pathname: '/' }, true), '/');
assert.equal(resolvePostAuthPath(undefined, true), '/');

assert.deepEqual(readAuthFromState({ from: { pathname: '/treino' } }), { pathname: '/treino' });
assert.equal(readAuthFromState(null), undefined);
assert.equal(readAuthFromState({}), undefined);

console.log('Auth redirect verification OK');
