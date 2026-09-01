import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCIAS } from '../../shared/types/index.js';
import { mergePreferencias } from '../src/utils/user-patch.js';

describe('preferências do Evolyn', () => {
  it('atualiza o som sem apagar as demais preferências', () => {
    const current = {
      ...DEFAULT_PREFERENCIAS,
      som_habilitado: true,
      sfx_volume: 0.7,
      frozen_streak_auto_usar: true,
    };

    const merged = mergePreferencias(current, { som_habilitado: false, sfx_volume: 0.4 });

    expect(merged.som_habilitado).toBe(false);
    expect(merged.sfx_volume).toBe(0.4);
    expect(merged.frozen_streak_auto_usar).toBe(true);
  });

  it('altera somente a preferência informada', () => {
    const current = {
      ...DEFAULT_PREFERENCIAS,
      ciclo_treinos: ['A', 'B'] as const,
      contagem_regressiva_habilitada: true,
    };

    const merged = mergePreferencias(current, { contagem_regressiva_habilitada: false });

    expect(merged.contagem_regressiva_habilitada).toBe(false);
    expect(merged.ciclo_treinos).toEqual(['A', 'B']);
  });
});
