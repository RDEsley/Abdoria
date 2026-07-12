import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_GENERIC_ENEMIES,
  CAMPAIGN_PLACES,
  CAMPAIGN_PLACES_BASE,
  CAMPAIGN_TEMPLATES,
  buildCampaignPosts,
  classifyExercise,
  placesForLevel,
  type CampaignCatalogInfo,
  type CampaignContext,
  type CampaignSession,
} from '../../shared/campaign/index.js';
import { AFK_ENEMIES } from '../../shared/afk/combat.js';

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

function session(overrides: Partial<CampaignSession> = {}): CampaignSession {
  return {
    id: 'sessao-1',
    treino_nome: 'Treino A',
    exercicios: [
      { slug: 'crunch', nome: 'Crunch', series: 3, repeticoes_realizadas: 12, modo: 'reps' },
      { slug: 'plank', nome: 'Plank', duracao_segundos: 45, modo: 'tempo' },
      { slug: 'superman', nome: 'Superman', series: 2, repeticoes_realizadas: 14, modo: 'reps' },
    ],
    duracao_total_segundos: 1320,
    xp_ganho: 82,
    concluido_em: '2026-07-12T10:00:00.000Z',
    ...overrides,
  };
}

function ctx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return { heroi: 'Richard', level: 1, bestiarioDesbloqueados: [], ...overrides };
}

describe('classifyExercise', () => {
  it('mapeia por característica, não por slug', () => {
    expect(classifyExercise(CATALOG.get('dragon-flag'))).toBe('chefe_derrotado'); // nível 4
    expect(classifyExercise(CATALOG.get('plank'))).toBe('poder_desperto'); // iso core
    expect(classifyExercise(CATALOG.get('wall-sit'))).toBe('defesa_heroica'); // iso não-core
    expect(classifyExercise(CATALOG.get('superman'))).toBe('pessoa_resgatada'); // costas
    expect(classifyExercise(CATALOG.get('bodyweight-squat'))).toBe('travessia'); // pernas
    expect(classifyExercise(CATALOG.get('push-up'))).toBe('fortaleza_rompida'); // peito
    expect(classifyExercise(CATALOG.get('burpee'))).toBe('horda_contida'); // dinâmico
    expect(classifyExercise(CATALOG.get('crunch'))).toBe('monstro_derrotado');
    expect(classifyExercise(undefined)).toBe('monstro_derrotado');
  });
});

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

describe('buildCampaignPosts', () => {
  it('é determinístico: mesma entrada gera exatamente os mesmos posts', () => {
    const a = buildCampaignPosts([session()], CATALOG, ctx());
    const b = buildCampaignPosts([session()], CATALOG, ctx());
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('gera post agregado (vila salva) só com 3+ exercícios', () => {
    const cheia = buildCampaignPosts([session()], CATALOG, ctx());
    expect(cheia.some((p) => p.tipo === 'vila_salva')).toBe(true);

    const curta = buildCampaignPosts(
      [session({ exercicios: session().exercicios.slice(0, 2) })],
      CATALOG,
      ctx(),
    );
    expect(curta.some((p) => p.tipo === 'vila_salva')).toBe(false);
    expect(curta).toHaveLength(2);
  });

  it('sem descobertas no Bestiário, nunca nomeia inimigo do jogo', () => {
    const sessoes = Array.from({ length: 12 }, (_, i) =>
      session({
        id: `s-${i}`,
        exercicios: [
          { slug: 'crunch', nome: 'Crunch', series: 3, repeticoes_realizadas: 12, modo: 'reps' },
          { slug: 'burpee', nome: 'Burpee', series: 3, repeticoes_realizadas: 10, modo: 'reps' },
          {
            slug: 'dragon-flag',
            nome: 'Dragon Flag',
            series: 3,
            repeticoes_realizadas: 5,
            modo: 'reps',
          },
        ],
      }),
    );
    const posts = buildCampaignPosts(sessoes, CATALOG, ctx({ bestiarioDesbloqueados: [] }));
    const todasLabels = Object.values(AFK_ENEMIES).map((e) => e.label);
    for (const post of posts) {
      for (const label of todasLabels) {
        expect(post.mensagem).not.toContain(label);
      }
    }
  });

  it('inimigos descobertos passam a aparecer; chefes só depois de derrotados', () => {
    const sessoes = Array.from({ length: 20 }, (_, i) =>
      session({
        id: `s-${i}`,
        exercicios: [
          { slug: 'crunch', nome: 'Crunch', series: 3, repeticoes_realizadas: 12, modo: 'reps' },
          {
            slug: 'dragon-flag',
            nome: 'Dragon Flag',
            series: 3,
            repeticoes_realizadas: 5,
            modo: 'reps',
          },
        ],
      }),
    );
    const posts = buildCampaignPosts(
      sessoes,
      CATALOG,
      ctx({ bestiarioDesbloqueados: ['bat', 'boss_lich'] }),
    );
    const texto = posts.map((p) => p.mensagem).join('\n');
    expect(texto).toContain(AFK_ENEMIES.bat.label); // comum descoberto aparece
    expect(texto).not.toContain(AFK_ENEMIES.zombie.label); // não descoberto, nunca
    const chefes = posts.filter((p) => p.tipo === 'chefe_derrotado');
    expect(chefes.length).toBeGreaterThan(0);
    // O chefe descoberto aparece; templates de "chefe sem nome" continuam
    // válidos mesmo com descobertas (narram um chefe diferente).
    expect(chefes.some((p) => p.mensagem.includes(AFK_ENEMIES.boss_lich.label))).toBe(true);
  });

  it('tipos sem pool (Lote 2) caem no fallback narrativo sem placeholder vazado', () => {
    const posts = buildCampaignPosts(
      [
        session({
          exercicios: [
            { slug: 'wall-sit', nome: 'Wall Sit', duracao_segundos: 45, modo: 'tempo' },
            {
              slug: 'push-up',
              nome: 'Push-Up',
              series: 3,
              repeticoes_realizadas: 12,
              modo: 'reps',
            },
            {
              slug: 'bodyweight-squat',
              nome: 'Squat',
              series: 3,
              repeticoes_realizadas: 16,
              modo: 'reps',
            },
          ],
        }),
      ],
      CATALOG,
      ctx(),
    );
    for (const post of posts) {
      expect(post.mensagem).not.toMatch(/\{\w+\}/);
      expect(CAMPAIGN_TEMPLATES.some((t) => t.tipo === post.tipo)).toBe(true);
    }
  });

  it('lugares respeitam a revelação por nível', () => {
    const sessoes = Array.from({ length: 30 }, (_, i) => session({ id: `s-${i}` }));
    const lugaresNivel1 = new Set(placesForLevel(1).map((p) => p.nome));
    const posts = buildCampaignPosts(sessoes, CATALOG, ctx({ level: 1 }));
    for (const post of posts) {
      expect(lugaresNivel1.has(post.lugar)).toBe(true);
    }
  });

  it('conta nova usa o pool genérico de inimigos', () => {
    const sessoes = Array.from({ length: 10 }, (_, i) =>
      session({
        id: `g-${i}`,
        exercicios: [
          { slug: 'crunch', nome: 'Crunch', series: 3, repeticoes_realizadas: 12, modo: 'reps' },
        ],
      }),
    );
    const texto = buildCampaignPosts(sessoes, CATALOG, ctx())
      .map((p) => p.mensagem)
      .join('\n');
    const usouGenerico = CAMPAIGN_GENERIC_ENEMIES.some((g) => texto.includes(g));
    expect(usouGenerico).toBe(true);
  });
});
