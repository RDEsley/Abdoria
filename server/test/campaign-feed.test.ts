import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_GENERIC_ENEMIES,
  CAMPAIGN_PLACES,
  CAMPAIGN_PLACES_BASE,
  CAMPAIGN_STREAK_MILESTONES,
  CAMPAIGN_STREAK_NARRATIVE_MIN,
  CAMPAIGN_VILA_SALVA_MIN_EXERCISES,
  buildCampaignPosts,
  placesForLevel,
  type CampaignCatalogInfo,
  type CampaignContext,
  type CampaignSession,
} from '../../shared/campaign/index.js';

const CATALOG = new Map<string, CampaignCatalogInfo>([
  ['crunch', { nivel: 1, prioridade: 'S', musculo_principal: 'superior', grupos: ['abdomen'] }],
  ['plank', { nivel: 1, prioridade: 'isometrico', musculo_principal: 'core', grupos: ['abdomen'] }],
  [
    'wall-sit',
    { nivel: 2, prioridade: 'isometrico', musculo_principal: 'completo', grupos: ['pernas'] },
  ],
  [
    'superman',
    { nivel: 1, prioridade: 'A', musculo_principal: 'completo', grupos: ['costas', 'gluteos'] },
  ],
  ['dragon-flag', { nivel: 4, prioridade: 'B', musculo_principal: 'core', grupos: ['abdomen'] }],
  [
    'burpee',
    {
      nivel: 3,
      prioridade: 'dinamico',
      musculo_principal: 'completo',
      grupos: ['abdomen', 'pernas', 'peito'],
    },
  ],
  [
    'push-up',
    { nivel: 2, prioridade: 'A', musculo_principal: 'superior', grupos: ['peito', 'bracos'] },
  ],
  [
    'bodyweight-squat',
    { nivel: 1, prioridade: 'A', musculo_principal: 'completo', grupos: ['pernas', 'gluteos'] },
  ],
]);

function ex(
  slug: string,
  overrides: Partial<CampaignSession['exercicios'][number]> = {},
): CampaignSession['exercicios'][number] {
  return { slug, nome: slug, series: 3, repeticoes_realizadas: 12, modo: 'reps', ...overrides };
}

function session(overrides: Partial<CampaignSession> = {}): CampaignSession {
  return {
    id: 'sessao-1',
    treino_nome: 'Treino A',
    exercicios: [
      ex('crunch'),
      ex('plank', { modo: 'tempo', duracao_segundos: 45 }),
      ex('superman'),
    ],
    duracao_total_segundos: 1320,
    xp_ganho: 82,
    concluido_em: '2026-07-12T10:00:00.000Z',
    ...overrides,
  };
}

function ctx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return { heroi: 'Richard', level: 1, ...overrides };
}

/** Sessão bem antiga só pra não deixar `target` ganhar o marco "primeiro treino". */
function warmup(): CampaignSession {
  return session({ id: 'warmup', concluido_em: '2020-01-01T08:00:00.000Z' });
}

describe('placesForLevel', () => {
  it('revela ~8 lugares no nível 1 e +3 por faixa de 5 níveis, com teto', () => {
    expect(placesForLevel(1)).toHaveLength(CAMPAIGN_PLACES_BASE);
    expect(placesForLevel(4)).toHaveLength(CAMPAIGN_PLACES_BASE);
    expect(placesForLevel(5)).toHaveLength(CAMPAIGN_PLACES_BASE + 3);
    expect(placesForLevel(10)).toHaveLength(CAMPAIGN_PLACES_BASE + 6);
    expect(placesForLevel(99)).toHaveLength(CAMPAIGN_PLACES.length);
    expect(placesForLevel(0)).toHaveLength(CAMPAIGN_PLACES_BASE);
  });
});

describe('buildCampaignPosts — 1 post por sessão', () => {
  it('é determinístico: mesma entrada gera exatamente os mesmos posts', () => {
    const a = buildCampaignPosts([session()], CATALOG, ctx());
    const b = buildCampaignPosts([session()], CATALOG, ctx());
    expect(a).toEqual(b);
  });

  it('gera exatamente 1 post por sessão, não 1 por exercício', () => {
    const posts = buildCampaignPosts(
      [session({ exercicios: [ex('crunch'), ex('plank'), ex('superman'), ex('burpee')] })],
      CATALOG,
      ctx(),
    );
    expect(posts).toHaveLength(1);
  });

  it('descarta sessões sem exercícios', () => {
    const posts = buildCampaignPosts(
      [session({ id: 'vazia', exercicios: [] }), session({ id: 'com-treino' })],
      CATALOG,
      ctx(),
    );
    expect(posts).toHaveLength(1);
    expect(posts[0].session_id).toBe('com-treino');
  });

  it('placeholders nunca vazam sem interpolação', () => {
    const posts = buildCampaignPosts(
      [
        session({
          exercicios: [
            ex('wall-sit', { modo: 'tempo', duracao_segundos: 45 }),
            ex('push-up'),
            ex('bodyweight-squat'),
          ],
        }),
      ],
      CATALOG,
      ctx(),
    );
    for (const post of posts) {
      expect(post.mensagem).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('outros_exercicios — lista secundária, não influencia a narrativa', () => {
  it('exclui só o índice do exercício vencedor, mesmo com slug repetido', () => {
    const alvo = session({
      id: 'alvo',
      exercicios: [ex('crunch'), ex('superman'), ex('crunch')],
    });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('pessoa_resgatada');
    expect(post.exercicio?.slug).toBe('superman');
    // os DOIS crunch (índices 0 e 2) devem sobrar — não some um deles por causa do slug repetido.
    expect(post.outros_exercicios).toHaveLength(2);
    expect(post.outros_exercicios.every((e) => e.slug === 'crunch')).toBe(true);
  });

  it('capítulo e missão cumprida (sem exercício-destaque) listam todos como secundários', () => {
    const alvo = session({
      id: 'alvo',
      exercicios: [ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch')],
    });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('vila_salva');
    expect(post.exercicio).toBeUndefined();
    expect(post.outros_exercicios).toHaveLength(5);
  });

  it('sessão de 1 exercício não tem secundários', () => {
    const alvo = session({ id: 'alvo', exercicios: [ex('superman')] });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.outros_exercicios).toHaveLength(0);
  });
});

describe('hierarquia de prioridade dentro da sessão', () => {
  it('resgate (costas) vence sobre monstro comum na mesma sessão', () => {
    const alvo = session({ id: 'alvo', exercicios: [ex('crunch'), ex('superman')] });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('pessoa_resgatada');
    expect(post.exercicio?.slug).toBe('superman');
  });

  it('chefe (nível 4) vence sobre resgate quando não há PR', () => {
    const alvo = session({ id: 'alvo', exercicios: [ex('superman'), ex('dragon-flag')] });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('chefe_derrotado');
    expect(post.exercicio?.slug).toBe('dragon-flag');
  });

  it('PR real vence sobre nível 4 sem PR e sobre qualquer outro tipo', () => {
    // Primeira sessão estabelece o recorde-base de crunch; a segunda supera —
    // PR real deve vencer mesmo com um exercício nível 4 (sem PR) no mesmo treino.
    const primeira = session({
      id: 's1',
      exercicios: [ex('crunch', { series: 2, repeticoes_realizadas: 8 })],
      concluido_em: '2026-07-01T09:00:00.000Z',
    });
    const segunda = session({
      id: 's2',
      exercicios: [ex('crunch', { series: 4, repeticoes_realizadas: 20 }), ex('dragon-flag')],
      concluido_em: '2026-07-08T09:00:00.000Z',
    });
    const posts = buildCampaignPosts([primeira, segunda], CATALOG, ctx());
    const postS2 = posts.find((p) => p.session_id === 's2')!;
    expect(postS2.tipo).toBe('chefe_derrotado');
    expect(postS2.exercicio?.slug).toBe('crunch'); // o que bateu PR, não o dragon-flag
  });

  it('poder desperto (core) vence defesa heroica (não-core)', () => {
    const alvo = session({
      id: 'alvo',
      exercicios: [
        ex('wall-sit', { modo: 'tempo', duracao_segundos: 40 }),
        ex('plank', { modo: 'tempo', duracao_segundos: 30 }),
      ],
    });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('poder_desperto');
    expect(post.exercicio?.slug).toBe('plank');
  });

  it('desempate por nível, depois prioridade de catálogo, depois ordem', () => {
    const alvo = session({ id: 'alvo', exercicios: [ex('push-up', { series: 3 })] });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('fortaleza_rompida');
  });

  it('vila_salva vence quando 5+ exercícios sem nenhum evento acima do piso', () => {
    const alvo = session({
      id: 'alvo',
      exercicios: [ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch')],
    });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('vila_salva');
  });

  it('sessão curta (< mínimo) sem evento forte cai no piso monstro_derrotado', () => {
    expect(CAMPAIGN_VILA_SALVA_MIN_EXERCISES).toBeGreaterThan(2);
    const alvo = session({ id: 'alvo', exercicios: [ex('crunch'), ex('crunch')] });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('monstro_derrotado');
  });
});

describe('capítulos — marcos de primeiro treino e streak', () => {
  it('a sessão mais antiga da conta sempre vira capítulo (primeiro treino)', () => {
    const s1 = session({ id: 's1', concluido_em: '2026-06-01T08:00:00.000Z' });
    const s2 = session({ id: 's2', concluido_em: '2026-06-05T08:00:00.000Z' });
    const posts = buildCampaignPosts([s1, s2], CATALOG, ctx());
    const primeiro = posts.find((p) => p.session_id === 's1')!;
    expect(primeiro.tipo).toBe('capitulo');
  });

  it('marcos pequenos (2, 3) NÃO viram capítulo — competem normalmente na hierarquia', () => {
    expect(CAMPAIGN_STREAK_MILESTONES).toContain(2);
    expect(CAMPAIGN_STREAK_MILESTONES).toContain(3);
    expect(CAMPAIGN_STREAK_NARRATIVE_MIN).toBe(7);
    const dias = Array.from({ length: 3 }, (_, i) =>
      session({
        id: `d${i + 1}`,
        exercicios: [ex('superman')], // resgate — vence sobre monstro, prova que narra o treino
        concluido_em: `2026-07-0${i + 1}T08:00:00.000Z`,
      }),
    );
    const posts = buildCampaignPosts(dias, CATALOG, ctx());
    const dia2 = posts.find((p) => p.session_id === 'd2')!;
    const dia3 = posts.find((p) => p.session_id === 'd3')!;
    expect(dia2.tipo).toBe('pessoa_resgatada'); // streak_2 não força capítulo
    expect(dia3.tipo).toBe('pessoa_resgatada'); // streak_3 não força capítulo
  });

  it('marco >= CAMPAIGN_STREAK_NARRATIVE_MIN (streak_7) vira capítulo', () => {
    // 7 dias consecutivos de treino (dias 1..7) — dia 7 deve bater o marco streak_7.
    const dias = Array.from({ length: 7 }, (_, i) =>
      session({
        id: `d${i + 1}`,
        exercicios: [ex('crunch')],
        concluido_em: `2026-07-0${i + 1}T08:00:00.000Z`,
      }),
    );
    const posts = buildCampaignPosts(dias, CATALOG, ctx());
    const dia7 = posts.find((p) => p.session_id === 'd7')!;
    expect(dia7.tipo).toBe('capitulo'); // marco streak_7
    expect(dia7.mensagem).not.toMatch(/\{\w+\}/);
  });

  it('capítulo tem prioridade máxima — vence mesmo com PR/chefe na mesma sessão', () => {
    const s1 = session({ id: 'unica', exercicios: [ex('dragon-flag')] });
    const posts = buildCampaignPosts([s1], CATALOG, ctx());
    // única sessão da conta = sempre 'primeiro', mesmo tendo exercício nível 4.
    expect(posts[0].tipo).toBe('capitulo');
  });
});

describe('pluralização genérica de contagens', () => {
  it('minutos/feitos no singular quando o valor é 1', () => {
    const alvo = session({
      id: 'alvo',
      exercicios: [ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch')],
      duracao_total_segundos: 50, // arredonda para 1 minuto
    });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.tipo).toBe('vila_salva');
    expect(post.mensagem).toMatch(/\b1 minuto\b/);
    expect(post.mensagem).not.toMatch(/\b1 minutos\b/);
  });

  it('minutos/feitos no plural quando o valor é > 1', () => {
    const alvo = session({
      id: 'alvo',
      exercicios: [ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch'), ex('crunch')],
      duracao_total_segundos: 1320,
    });
    const posts = buildCampaignPosts([warmup(), alvo], CATALOG, ctx());
    const post = posts.find((p) => p.session_id === 'alvo')!;
    expect(post.mensagem).toMatch(/\b5 feitos\b/);
    expect(post.mensagem).toMatch(/\b22 minutos\b/);
  });
});

describe('encontros genéricos', () => {
  it('conta nova usa o pool genérico de inimigos em algum momento', () => {
    const sessoes = Array.from({ length: 10 }, (_, i) =>
      session({
        id: `g-${i}`,
        exercicios: [ex('burpee')],
        concluido_em: `2026-01-${10 + i}T08:00:00.000Z`,
      }),
    );
    const texto = buildCampaignPosts(sessoes, CATALOG, ctx())
      .map((p) => p.mensagem)
      .join('\n');
    const usouGenerico = CAMPAIGN_GENERIC_ENEMIES.some((g) => texto.includes(g));
    expect(usouGenerico).toBe(true);
  });
});

describe('lugares por nível', () => {
  it('lugares do post respeitam a revelação por nível', () => {
    const sessoes = Array.from({ length: 15 }, (_, i) =>
      session({ id: `s-${i}`, concluido_em: `2026-02-${10 + i}T08:00:00.000Z` }),
    );
    const lugaresNivel1 = new Set(placesForLevel(1).map((p) => p.nome));
    const posts = buildCampaignPosts(sessoes, CATALOG, ctx({ level: 1 }));
    for (const post of posts) {
      expect(lugaresNivel1.has(post.lugar)).toBe(true);
    }
  });
});
