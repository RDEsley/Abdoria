import { AFK_ENEMIES, type AfkEnemyId, type AfkEnemyTier } from './combat.js';

export type SlimeMaterialItemId = `slime_material_${AfkEnemyId}`;

export interface SlimeMaterialDefinition {
  id: SlimeMaterialItemId;
  enemyId: AfkEnemyId;
  name: string;
  description: string;
  icon: string;
  tier: AfkEnemyTier;
  dropChancePct: number;
  sellPrice: number;
}

export interface SlimeMaterialStockItem extends SlimeMaterialDefinition {
  quantity: number;
}

export const SLIME_MATERIAL_DROP_CHANCE_PCT: Record<AfkEnemyTier, number> = {
  common: 10,
  elite: 5,
  boss: 20,
};

export const SLIME_MATERIAL_SELL_PRICE: Record<AfkEnemyTier, number> = {
  common: 3,
  elite: 4,
  boss: 15,
};

const MATERIAL_SEEDS = {
  bat: ['Asa Gelatinosa', 'Uma asa leve deixada pelo Slime Morcego.', '🦇'],
  zombie: ['Tufo de Musgo', 'Musgo úmido que crescia sobre o Slime Musgo.', '🌿'],
  skeleton: ['Osso Gelatinoso', 'Um pequeno osso envolto em essência slime.', '🦴'],
  slime_macaco: ['Banana', 'A fruta favorita do Slime Macaco.', '🍌'],
  slime_agua: ['Gota de Água', 'Uma gota que nunca perde sua forma.', '💧'],
  slime_doce: ['Pirulito', 'Um pirulito açucarado do Slime de Doce.', '🍭'],
  slime_chocolate: ['Barra de Chocolate', 'Chocolate condensado dentro do slime.', '🍫'],
  sand_slime: ['Frasco de Areia', 'Areia dourada recolhida nas ruínas.', '🏺'],
  lich_slime: ['Runa Menor', 'Fragmento rúnico do Slime Lich Menor.', '🔮'],
  stone_slime: ['Pedregulho Gelatinoso', 'Uma pedra estranhamente flexível.', '🪨'],
  clock_slime: ['Engrenagem Slime', 'Ainda gira no ritmo do Slime Relógio.', '⚙️'],
  sleepy_slime: ['Pena Macia', 'Uma pena carregada pelo Slime Sonolento.', '🪶'],
  dream_slime: ['Poeira dos Sonhos', 'Brilha suavemente quando alguém adormece.', '✨'],
  armored_skeleton: ['Placa de Armadura', 'Liga resistente do Slime Blindado.', '🛡️'],
  crystal_slime: ['Estilhaço Cristalino', 'Cristal puro formado em essência slime.', '💎'],
  storm_slime: ['Núcleo de Trovão', 'Pulsa com a eletricidade do Slime Trovão.', '⚡'],
  slime_knight: ['Brasão do Cavaleiro', 'Símbolo de honra do Slime Cavaleiro.', '⚜️'],
  slime_chumbo: ['Lingote de Chumbo', 'Metal denso condensado pelo Slime Chumbo.', '🔩'],
  dune_brute: ['Presa das Dunas', 'Presa endurecida pelo calor do deserto.', '🦷'],
  necro_slime: ['Osso Rúnico', 'Osso marcado pela magia do Slime Necromante.', '☠️'],
  stone_guardian: ['Selo de Pedra', 'Selo protetor do Guardião de Pedra.', '🗿'],
  chronos_slime: ['Ponteiro de Cronos', 'Marca segundos que ainda não aconteceram.', '🕰️'],
  nightmare_slime: ['Travesseiro Sombrio', 'Transforma sonhos tranquilos em pesadelos.', '🌑'],
  golden_slime: ['Medalha Dourada', 'Uma lembrança raríssima do Golden Slime.', '🏅'],
  magic_rabbit: ['Cenoura Arcana', 'Cenoura saturada pela magia do Slime Mágico.', '🥕'],
  slime_enigma: ['Fragmento de Interrogação', 'Uma peça de um mistério ainda sem resposta.', '❓'],
  slime_binario: ['Bit Gelatinoso', 'Alterna incessantemente entre zero e um.', '💾'],
  boss_colossus: ['Coroa do Rei Slime', 'Símbolo real do guardião da Trilha Verdejante.', '👑'],
  boss_crocodile: ['Escama de Areia', 'Escama abrasiva do Slime Crocodilo.', '🐊'],
  boss_lich: ['Filactério Gelatinoso', 'Recipiente da antiga magia do Slime Lich.', '🧿'],
  boss_hydra: ['Presa da Hidra', 'Uma presa que parece querer se multiplicar.', '🐲'],
  boss_golem: ['Coração de Pedra', 'O núcleo ainda morno do Golem de Pedra.', '🫀'],
  boss_procrastinador: ['Relógio Adiado', 'Sempre promete tocar o alarme mais tarde.', '⏰'],
  boss_preguica: ['Travesseiro Real', 'O travesseiro mais confortável de Abdoria.', '🛏️'],
} satisfies Record<AfkEnemyId, readonly [name: string, description: string, icon: string]>;

export const SLIME_MATERIALS: readonly SlimeMaterialDefinition[] = (
  Object.keys(MATERIAL_SEEDS) as AfkEnemyId[]
).map((enemyId) => {
  const [name, description, icon] = MATERIAL_SEEDS[enemyId];
  const tier = AFK_ENEMIES[enemyId].tier;
  return {
    id: `slime_material_${enemyId}`,
    enemyId,
    name,
    description,
    icon,
    tier,
    dropChancePct: SLIME_MATERIAL_DROP_CHANCE_PCT[tier],
    sellPrice: SLIME_MATERIAL_SELL_PRICE[tier],
  };
});

export const SLIME_MATERIAL_BY_ID = Object.fromEntries(
  SLIME_MATERIALS.map((material) => [material.id, material]),
) as Record<SlimeMaterialItemId, SlimeMaterialDefinition>;

export const SLIME_MATERIAL_BY_ENEMY_ID = Object.fromEntries(
  SLIME_MATERIALS.map((material) => [material.enemyId, material]),
) as Record<AfkEnemyId, SlimeMaterialDefinition>;

const SLIME_MATERIAL_IDS = new Set<string>(SLIME_MATERIALS.map((material) => material.id));

export function isSlimeMaterialItemId(value: string): value is SlimeMaterialItemId {
  return SLIME_MATERIAL_IDS.has(value);
}

export function getSlimeMaterialForEnemy(enemyId: AfkEnemyId): SlimeMaterialDefinition {
  return SLIME_MATERIAL_BY_ENEMY_ID[enemyId];
}
