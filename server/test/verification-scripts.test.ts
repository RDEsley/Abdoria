import { describe, it } from 'vitest';

/**
 * Ponte para os scripts de verificação de scripts/dev: cada script roda suas
 * asserções no import (e lança em caso de falha), então importá-los sob o
 * vitest os transforma em testes de regressão sem duplicar a lógica. Eles
 * continuam executáveis isoladamente via `npx tsx scripts/dev/<nome>.ts`.
 * Conversões granulares (um `it` por regra) acontecem quando cada área for
 * refatorada.
 */
describe('scripts de verificação (scripts/dev)', () => {
  it('validate-rep-scheme-persist: merge de dados salvos preserva rep scheme', async () => {
    await import('../../scripts/dev/validate-rep-scheme-persist.ts');
  });

  it('validate-similar-exercises: similaridade e escolha de preset por ciclo', async () => {
    await import('../../scripts/dev/validate-similar-exercises.ts');
  });
});
