import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCIAS } from '../../shared/types/index.js';
import {
  buildAudioPreferenciasPatch,
  createCoalescingAudioPersister,
} from '../../shared/settings/audio-persist.js';
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

  it('patch só de áudio não altera notificações, streak, treino nem demais prefs', () => {
    const current = {
      ...DEFAULT_PREFERENCIAS,
      som_habilitado: true,
      sfx_volume: 0.7,
      notificacoes_opt_out: true,
      frozen_streak_auto_usar: false,
      ciclo_treinos: ['A', 'B'] as const,
      descanso_padrao_seg: 45,
      contagem_regressiva_habilitada: true,
      tom_texto: 'jogo' as const,
      tutorial_visto: true,
    };

    const patch = buildAudioPreferenciasPatch(false, 0.2);
    expect(Object.keys(patch).sort()).toEqual(['sfx_volume', 'som_habilitado']);
    expect('tom_texto' in patch).toBe(false);

    const merged = mergePreferencias(current, patch);

    expect(merged.som_habilitado).toBe(false);
    expect(merged.sfx_volume).toBe(0.2);
    expect(merged.notificacoes_opt_out).toBe(true);
    expect(merged.frozen_streak_auto_usar).toBe(false);
    expect(merged.ciclo_treinos).toEqual(['A', 'B']);
    expect(merged.descanso_padrao_seg).toBe(45);
    expect(merged.contagem_regressiva_habilitada).toBe(true);
    expect(merged.tom_texto).toBe('jogo');
    expect(merged.tutorial_visto).toBe(true);
  });

  it('outra preferência mudou antes do flush de áudio — merge preserva a mudança', () => {
    const afterNotifSave = {
      ...DEFAULT_PREFERENCIAS,
      som_habilitado: true,
      sfx_volume: 0.7,
      notificacoes_opt_out: true,
    };

    const merged = mergePreferencias(
      afterNotifSave,
      buildAudioPreferenciasPatch(true, 0.55),
    );

    expect(merged.sfx_volume).toBe(0.55);
    expect(merged.notificacoes_opt_out).toBe(true);
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

describe('persistência coalescida de áudio', () => {
  it('OFF → ON rápido: estado final persistido é ON', async () => {
    const writes: boolean[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const persister = createCoalescingAudioPersister(async (som) => {
      await gate;
      writes.push(som);
    });

    void persister.persist(false, 0.7);
    await Promise.resolve();
    void persister.persist(true, 0.7);
    release();

    await vi.waitFor(() => {
      expect(writes.at(-1)).toBe(true);
    });
    expect(writes.every((value) => value === false || value === true)).toBe(true);
  });

  it('ON → OFF rápido: estado final persistido é OFF', async () => {
    const writes: boolean[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const persister = createCoalescingAudioPersister(async (som) => {
      await gate;
      writes.push(som);
    });

    void persister.persist(true, 0.7);
    await Promise.resolve();
    void persister.persist(false, 0.7);
    release();

    await vi.waitFor(() => {
      expect(writes.at(-1)).toBe(false);
    });
  });

  it('arrastar volume várias vezes: só o último valor conhecido grava após coalesce', async () => {
    const writes: number[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const persister = createCoalescingAudioPersister(async (_som, volume) => {
      await gate;
      writes.push(volume);
    });

    void persister.persist(true, 0.1);
    await Promise.resolve();
    void persister.persist(true, 0.4);
    void persister.persist(true, 0.9);
    release();

    await vi.waitFor(() => {
      expect(writes.at(-1)).toBe(0.9);
    });
  });

  it('alterar volume e sair imediatamente: flush grava o último valor', async () => {
    const writes: number[] = [];
    const persister = createCoalescingAudioPersister(async (_som, volume) => {
      writes.push(volume);
    });

    await persister.persist(true, 0.42);
    expect(writes).toEqual([0.42]);
  });
});
