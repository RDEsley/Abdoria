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
  it('verify-afk: drops por kill, cap 24h, combate e boss', async () => {
    await import('../../scripts/dev/verify-afk.ts');
  });

  it('verify-patrol-weapons: catálogo de armas, dano, crítico e drops', async () => {
    await import('../../scripts/dev/verify-patrol-weapons.ts');
  });

  it('verify-daily-shop-claim: resgate grátis persiste após sync no mesmo dia', async () => {
    await import('../../scripts/dev/verify-daily-shop-claim.ts');
  });

  it('verify-equipment-filter: equipamento marcado + slug bloqueado nas recomendações', async () => {
    await import('../../scripts/dev/verify-equipment-filter.ts');
  });

  it('verify-inventory-bestiario: stack cap e drops de bestiário', async () => {
    await import('../../scripts/dev/verify-inventory-bestiario.ts');
  });

  it('validate-equipment: exercícios gated por equipamento no seed', async () => {
    await import('../../scripts/dev/validate-equipment.ts');
  });

  it('validate-rep-scheme-persist: merge de dados salvos preserva rep scheme', async () => {
    await import('../../scripts/dev/validate-rep-scheme-persist.ts');
  });

  it('validate-similar-exercises: similaridade e escolha de preset por ciclo', async () => {
    await import('../../scripts/dev/validate-similar-exercises.ts');
  });
});
