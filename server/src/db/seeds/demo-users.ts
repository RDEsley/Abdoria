import type { NivelUsuario, Objetivo } from '../../types/index.js';

export interface DemoUserSeed {
  email: string;
  nome: string;
  idade: number;
  nivel: NivelUsuario;
  objetivo: Objetivo;
  gamificacao: {
    nivel_xp: number;
    streak_atual: 0;
    streak_maior: 0;
    total_minutos: number;
    conquistas: string[];
  };
}

/** RNG determinística (mulberry32) — a seed sempre gera a mesma comunidade. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES = [
  'Diego Lima',
  'Henrique Alves',
  'Marco Antônio',
  'Bruno Costa',
  'João Pedro',
  'Felipe Souza',
  'Ana Beatriz',
  'Larissa Campos',
  'Giulia Ferreira',
  'Carla Mendes',
  'Rafael Torres',
  'Gustavo Ramos',
  'Thiago Barbosa',
  'Camila Duarte',
  'Fernanda Reis',
  'Lucas Martins',
  'Vinícius Prado',
  'Beatriz Moraes',
  'Amanda Farias',
  'Rodrigo Pires',
  'Caio Nogueira',
  'Juliana Castro',
  'Patrícia Vieira',
  'Leonardo Dias',
  'Matheus Cardoso',
  'Renata Lopes',
  'André Fonseca',
  'Paulo Henrique',
  'Débora Nunes',
  'Sérgio Batista',
  'Vitor Hugo',
  'Natália Freitas',
  'Eduardo Teixeira',
  'Priscila Ramos',
  'Fábio Cunha',
  'Igor Machado',
  'Sabrina Rocha',
  'Otávio Neves',
  'Letícia Andrade',
  'Marcelo Pinto',
  'Gabriel Moura',
  'Tatiane Correia',
  'Wesley Cardozo',
  'Aline Bezerra',
  'Douglas Freire',
  'Cristiano Melo',
  'Simone Araújo',
  'Roberto Guedes',
  'Bianca Sales',
  'Emerson Tavares',
  'Yasmin Cavalcante',
  'Ricardo Aguiar',
  'Bruna Siqueira',
  'Alexandre Brito',
  'Michele Santana',
  'Everton Braga',
  'Kaique Monteiro',
  'Vanessa Peixoto',
  'Anderson Rezende',
  'Priscilla Gomes',
  'Nathan Xavier',
  'Larissa Amaral',
  'Josué Carvalho',
  'Elias Ribeiro',
  'Milena Barros',
  'Diego Fontes',
  'Adriano Leal',
  'Cauã Bernardes',
  'Rebeca Furtado',
  'Guilherme Sá',
  'Danilo Rocha',
  'Sofia Vidal',
  'Renan Coelho',
  'Ítalo Nascimento',
  'Manuela Paiva',
  'Wallace Cordeiro',
  'Heitor Assunção',
  'Luana Quaresma',
  'Breno Sampaio',
  'Isaac Verissimo',
  'Talita Macedo',
  'Cléber Antunes',
  'Rogério Valente',
  'Karina Bastos',
  'Murilo Guerra',
  'Ferdinando Rios',
  'Denise Camargo',
  'Fabrício Lemos',
  'Jonas Medeiros',
  'Tainá Pontes',
  'Otacílio Braz',
  'Wagner Solano',
  'Célia Bittencourt',
  'Osvaldo Franco',
  'Nicolas Aires',
  'Sueli Cardoso',
  'Benedito Rangel',
  'Cátia Marques',
  'Valdir Nogueira',
  'Marta Espíndola',
  'Silvana Torres',
];

const OBJETIVOS: Objetivo[] = ['definicao', 'forca', 'resistencia', 'manutencao'];

const CONQUISTAS_POR_MARCO: { minXp: number; ids: string[] }[] = [
  { minXp: 0, ids: ['primeiro_treino'] },
  { minXp: 150, ids: ['treinos_5', 'minutos_60'] },
  { minXp: 260, ids: ['exercicios_50'] },
  { minXp: 420, ids: ['nivel_3', 'ciclo_ab'] },
  { minXp: 620, ids: ['treino_completo'] },
  { minXp: 900, ids: ['nivel_5', 'exercicios_100', 'treinos_25'] },
  { minXp: 1400, ids: ['ciclo_completo', 'minutos_500'] },
  { minXp: 2200, ids: ['nivel_10', 'semana_perfeita'] },
  { minXp: 3400, ids: ['treinos_100', 'exercicios_500'] },
  { minXp: 5200, ids: ['xp_mestre'] },
];

function conquistasFor(nivelXp: number): string[] {
  const ids = new Set<string>();
  for (const marco of CONQUISTAS_POR_MARCO) {
    if (nivelXp >= marco.minXp) marco.ids.forEach((id) => ids.add(id));
  }
  return [...ids];
}

function nivelFor(xp: number): NivelUsuario {
  if (xp >= 1400) return 'avancado';
  if (xp >= 500) return 'intermediario';
  return 'iniciante';
}

function slugFromNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

/**
 * Comunidade fictícia realista de 100 jogadores: distribuição em pirâmide
 * (poucos veteranos com XP/streak altíssimos, maioria intermediária/iniciante),
 * gerada de forma determinística. Sem os nomes "Isabela"/"Mariana".
 */
function buildDemoUsers(): DemoUserSeed[] {
  const rng = makeRng(20260719);
  const used = new Set<string>();

  return NOMES.slice(0, 100).map((nome, index) => {
    // Pirâmide: rank 0 é o topo. XP cai exponencialmente com o rank.
    const rankFactor = 1 - index / 100;
    const jitter = 0.75 + rng() * 0.5;
    const nivelXp = Math.max(30, Math.round(Math.pow(rankFactor, 2.4) * 8200 * jitter));

    // Preserva a sequência determinística usada pelos demais atributos dos NPCs.
    rng();
    rng();
    rng();

    const totalMinutos = Math.round(nivelXp * (0.6 + rng() * 0.5));
    const idade = 17 + Math.floor(rng() * 33);

    let slug = slugFromNome(nome);
    while (used.has(slug)) slug = `${slug}${index}`;
    used.add(slug);

    return {
      email: `${slug}.npc@abdoria.local`,
      nome,
      idade,
      nivel: nivelFor(nivelXp),
      objetivo: OBJETIVOS[Math.floor(rng() * OBJETIVOS.length)],
      gamificacao: {
        nivel_xp: nivelXp,
        streak_atual: 0,
        streak_maior: 0,
        total_minutos: totalMinutos,
        conquistas: conquistasFor(nivelXp),
      },
    };
  });
}

export const DEMO_USERS: DemoUserSeed[] = buildDemoUsers();

export const DEMO_USER_EMAILS = DEMO_USERS.map((u) => u.email);
