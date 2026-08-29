/**
 * Lugares do Mapa da Campanha, em ordem de revelação.
 * Não há mecânica de desbloqueio de lugar no jogo: o mundo expande com o
 * nível de XP do herói (decisão aprovada em 2026-07-12). Curva inicial —
 * calibrar no QA conforme o volume real de posts.
 */

export interface CampaignPlace {
  id: string;
  nome: string;
  /** Artigo definido do nome — concordância de "no/do/pelo" nos templates. */
  artigo: 'o' | 'a' | 'os' | 'as';
}

export const CAMPAIGN_PLACES: CampaignPlace[] = [
  // Base (nível 1)
  { id: 'pedraverde', nome: 'Vila de Pedraverde', artigo: 'a' },
  { id: 'bosque-sereno', nome: 'Bosque Sereno', artigo: 'o' },
  { id: 'estrada-sal', nome: 'Estrada do Sal', artigo: 'a' },
  { id: 'brumafunda', nome: 'Moinho de Brumafunda', artigo: 'o' },
  { id: 'poco-dorias', nome: 'Poço das Moedas', artigo: 'o' },
  { id: 'colinas-mansas', nome: 'Colinas Mansas', artigo: 'as' },
  { id: 'vau-raso', nome: 'Ponte do Vau Raso', artigo: 'a' },
  { id: 'mercado-doria', nome: 'Mercado de Doria', artigo: 'o' },
  // Revelação progressiva
  { id: 'passo-gelado', nome: 'Passo Gelado', artigo: 'o' },
  { id: 'torre-vigia', nome: 'Torre de Vigia', artigo: 'a' },
  { id: 'fenda-cinzenta', nome: 'Fenda Cinzenta', artigo: 'a' },
  { id: 'campos-ambar', nome: 'Campos de Âmbar', artigo: 'os' },
  { id: 'pantano-vidro', nome: 'Pântano de Vidro', artigo: 'o' },
  { id: 'forte-sombrio', nome: 'Forte Sombrio', artigo: 'o' },
  { id: 'picos-uivantes', nome: 'Picos Uivantes', artigo: 'os' },
  { id: 'ruinas-doria', nome: 'Ruínas de Doria', artigo: 'as' },
  { id: 'lago-fumegante', nome: 'Lago Fumegante', artigo: 'o' },
  { id: 'gruta-luminosa', nome: 'Gruta Luminosa', artigo: 'a' },
  { id: 'vale-ecos', nome: 'Vale dos Ecos', artigo: 'o' },
  { id: 'sete-velas', nome: 'Porto de Sete Velas', artigo: 'o' },
  { id: 'deserto-quartzo', nome: 'Deserto de Quartzo', artigo: 'o' },
  { id: 'floresta-petrificada', nome: 'Floresta Petrificada', artigo: 'a' },
  { id: 'abadia-partida', nome: 'Abadia Partida', artigo: 'a' },
  { id: 'canion-trovao', nome: 'Cânion do Trovão', artigo: 'o' },
  { id: 'ilhas-crepusculo', nome: 'Ilhas do Crepúsculo', artigo: 'as' },
  { id: 'biblioteca-soterrada', nome: 'Biblioteca Soterrada', artigo: 'a' },
  { id: 'espinhaco-dragao', nome: 'Espinhaço do Dragão', artigo: 'o' },
  { id: 'cidadela-vidro', nome: 'Cidadela de Vidro', artigo: 'a' },
  { id: 'coracao-tempestade', nome: 'Coração da Tempestade', artigo: 'o' },
  { id: 'trono-fim', nome: 'Trono do Fim do Mundo', artigo: 'o' },
];

/** Lugares revelados no nível 1. */
export const CAMPAIGN_PLACES_BASE = 8;
/** Lugares extras por faixa de nível. */
export const CAMPAIGN_PLACES_PER_BAND = 3;
/** Tamanho da faixa de nível (a cada N níveis, revela mais lugares). */
export const CAMPAIGN_LEVEL_BAND = 5;

/** Lugares visíveis para um nível de herói (mundo completo ~nível 37). */
export function placesForLevel(level: number): CampaignPlace[] {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const extra = Math.floor(safeLevel / CAMPAIGN_LEVEL_BAND) * CAMPAIGN_PLACES_PER_BAND;
  return CAMPAIGN_PLACES.slice(0, Math.min(CAMPAIGN_PLACES.length, CAMPAIGN_PLACES_BASE + extra));
}
