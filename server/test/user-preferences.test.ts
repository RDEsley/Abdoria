import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCIAS } from '../../shared/types/index.js';
import { mergePreferencias } from '../src/utils/user-patch.js';

describe('preferências da Exploração', () => {
  it('persiste a descoberta do RPG sem apagar as demais preferências', () => {
    const current = {
      ...DEFAULT_PREFERENCIAS,
      personagem_genero: 'feminino' as const,
      som_habilitado: false,
    };

    const merged = mergePreferencias(current, { rpg_fab_descoberto: true });

    expect(merged.rpg_fab_descoberto).toBe(true);
    expect(merged.personagem_genero).toBe('feminino');
    expect(merged.som_habilitado).toBe(false);
  });

  it('troca somente o gênero do personagem quando solicitado nas configurações', () => {
    const current = {
      ...DEFAULT_PREFERENCIAS,
      personagem_genero: 'feminino' as const,
      rpg_fab_descoberto: true,
      baus_abertura_rapida: true,
    };

    const merged = mergePreferencias(current, { personagem_genero: 'masculino' });

    expect(merged.personagem_genero).toBe('masculino');
    expect(merged.rpg_fab_descoberto).toBe(true);
    expect(merged.baus_abertura_rapida).toBe(true);
  });
});
