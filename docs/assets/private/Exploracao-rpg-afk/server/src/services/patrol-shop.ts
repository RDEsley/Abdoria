import {
  AFK_CRIT_BONUS_ESPADA,
  AFK_CRIT_STREAK_STEP_ARCO,
  AFK_LEVEL10_BOW_CRIT_CHANCE,
  AFK_LEVEL10_SWORD_CRIT_CHANCE,
  CURRENCY_NAME,
  type SlimeMaterialRarity,
  type PatrolArmasState,
  type PatrolShopCatalogItem,
  type PatrolShopResponse,
  type PatrolWeaponDefinition,
  type PatrolWeaponKind,
  patrolCritChance,
  patrolCritDamage,
  patrolHeroDamage,
  patrolWeaponsByKind,
  PATROL_WEAPON_BY_ID,
  PATROL_WEAPON_RARITY_LABELS,
  resolveCosmeticos,
  resolvePatrolArmas,
} from '../types/index.js';
import type { UserMutable } from '../repositories/user-repository.js';
import type { UserRecord } from '../types/user-record.js';
import { User } from '../domain/User.js';
import { readMoedaBalance } from './economy.js';
import {
  readSlimeMaterialStock,
  sellSlimeMaterial as sellSlimeMaterialFromInventory,
} from './inventory.js';

function ensurePatrolArmas(user: UserMutable): PatrolArmasState {
  const resolved = resolvePatrolArmas(user.preferencias.patrol_armas);
  user.preferencias.patrol_armas = resolved;
  return resolved;
}

function unlockLabel(def: PatrolWeaponDefinition, desbloqueada: boolean): string {
  if (desbloqueada) return 'Desbloqueado';
  if (def.unlock.tipo === 'gratis') return 'Grátis';
  if (def.unlock.tipo === 'futuro') return 'Em breve';
  if (def.unlock.tipo === 'boss') return def.unlock.label;
  return `${def.unlock.preco_moedas} ${CURRENCY_NAME}`;
}

function toCatalogItem(
  def: PatrolWeaponDefinition,
  armas: PatrolArmasState,
  abdoria: number,
  armaPreferida: PatrolWeaponKind,
): PatrolShopCatalogItem {
  const desbloqueada = armas.desbloqueados.includes(def.id);
  const slotEquipped =
    def.kind === 'arco'
      ? armas.arco_equipado === def.id
      : def.kind === 'espada'
        ? armas.espada_equipada === def.id
        : armas.magia_equipada === def.id;
  const equipada = slotEquipped && def.kind === armaPreferida;
  const futuro = def.unlock.tipo === 'futuro';
  const pode_comprar =
    !desbloqueada && !futuro && def.unlock.tipo === 'moedas' && abdoria >= def.unlock.preco_moedas;
  const dano_total = patrolHeroDamage(def.kind, def.id);
  // Armas Secret (nível 10) exibem o crítico especial contra elites/bosses.
  const chance_critico =
    def.nivel === 10 && def.kind !== 'magia'
      ? def.kind === 'arco'
        ? AFK_LEVEL10_BOW_CRIT_CHANCE
        : AFK_LEVEL10_SWORD_CRIT_CHANCE
      : patrolCritChance(def.kind);

  return {
    id: def.id,
    kind: def.kind,
    nivel: def.nivel,
    nome: def.nome,
    descricao: def.descricao,
    raridade: def.raridade,
    desbloqueada,
    equipada,
    pode_comprar,
    futuro,
    unlock_label: unlockLabel(def, desbloqueada),
    unlock: def.unlock,
    dano_bonus: def.dano_base,
    dano_base: def.dano_base,
    dano_total,
    crit_bonus:
      def.kind === 'magia'
        ? 0
        : def.kind === 'arco'
          ? AFK_CRIT_STREAK_STEP_ARCO
          : AFK_CRIT_BONUS_ESPADA,
    dano_critico: patrolCritDamage(dano_total, def.kind, 0),
    chance_critico,
  };
}

export function buildPatrolShopResponse(user: UserRecord): PatrolShopResponse {
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const abdoria = readMoedaBalance(user);
  const rawPreferida = user.preferencias?.arma_preferida;
  const armaPreferida: PatrolWeaponKind =
    rawPreferida === 'espada' || rawPreferida === 'magia' ? rawPreferida : 'arco';

  return {
    abdoria,
    armas,
    arma_preferida: armaPreferida,
    arcos: patrolWeaponsByKind('arco').map((def) =>
      toCatalogItem(def, armas, abdoria, armaPreferida),
    ),
    espadas: patrolWeaponsByKind('espada').map((def) =>
      toCatalogItem(def, armas, abdoria, armaPreferida),
    ),
    magias: patrolWeaponsByKind('magia').map((def) =>
      toCatalogItem(def, armas, abdoria, armaPreferida),
    ),
    materials: readSlimeMaterialStock(user),
  };
}

export async function loadUserForPatrolShop(userId: string) {
  return User.findById(userId);
}

export async function purchasePatrolWeapon(userId: string, itemId: string) {
  const user = await User.findById(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const def = PATROL_WEAPON_BY_ID[itemId];
  if (!def) {
    return { error: 'Item não encontrado.', status: 404 as const };
  }
  if (def.unlock.tipo === 'futuro') {
    return { error: 'Este item ainda não está disponível.', status: 400 as const };
  }
  if (def.unlock.tipo === 'boss') {
    return { error: def.unlock.label, status: 400 as const };
  }
  if (def.unlock.tipo === 'gratis') {
    return { error: 'Este item já é gratuito.', status: 400 as const };
  }

  const armas = ensurePatrolArmas(user);
  if (armas.desbloqueados.includes(itemId)) {
    return { error: 'Você já possui este item.', status: 400 as const };
  }

  const cosmeticos = resolveCosmeticos(user.cosmeticos, user.gamificacao.nivel_xp);
  const preco = def.unlock.preco_moedas;
  if (cosmeticos.moedas < preco) {
    return {
      error: `${CURRENCY_NAME} insuficientes. Faltam ${preco - cosmeticos.moedas} ${CURRENCY_NAME}.`,
      status: 400 as const,
    };
  }

  cosmeticos.moedas -= preco;
  user.cosmeticos = cosmeticos;
  armas.desbloqueados.push(itemId);
  if (def.kind === 'arco') armas.arco_equipado = itemId;
  if (def.kind === 'espada') armas.espada_equipada = itemId;
  if (def.kind === 'magia') armas.magia_equipada = itemId;
  user.preferencias.patrol_armas = armas;
  user.preferencias.arma_preferida = def.kind;

  // A compra não altera combate/AFK. Limitar as colunas evita que uma leitura
  // antiga da loja sobrescreva HP ou progresso gravados durante a compra.
  await user.save({ profileColumns: ['preferencias', 'cosmeticos'] });

  return {
    user,
    item: toCatalogItem(def, armas, cosmeticos.moedas, def.kind),
    abdoria_gasta: preco,
  };
}

export async function equipPatrolWeapon(userId: string, kind: PatrolWeaponKind, itemId: string) {
  if (kind !== 'arco' && kind !== 'espada' && kind !== 'magia') {
    return { error: 'Tipo de arma inválido.', status: 400 as const };
  }

  const user = await User.findById(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const def = PATROL_WEAPON_BY_ID[itemId];
  if (!def || def.kind !== kind) {
    return { error: 'Item não encontrado.', status: 404 as const };
  }

  const armas = ensurePatrolArmas(user);
  if (!armas.desbloqueados.includes(itemId)) {
    return { error: 'Desbloqueie este item antes de equipar.', status: 400 as const };
  }

  if (kind === 'arco') armas.arco_equipado = itemId;
  else if (kind === 'espada') armas.espada_equipada = itemId;
  else armas.magia_equipada = itemId;

  user.preferencias.patrol_armas = armas;
  user.preferencias.arma_preferida = kind;
  // Equipar no meio da luta não pode regravar o snapshot AFK lido no início
  // desta requisição; só a preferência de equipamento pertence a este fluxo.
  await user.save({ profileColumns: ['preferencias'] });

  return { user, item: def };
}

export async function sellPatrolMaterial(userId: string, itemId: string, quantity: number | 'all') {
  const user = await User.findById(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const result = sellSlimeMaterialFromInventory(user, itemId, quantity);
  if (!result.ok) return { error: result.error, status: 400 as const };

  await user.save({ profileColumns: ['inventario', 'cosmeticos'] });
  return {
    user,
    quantity_sold: result.quantity_sold,
    coins_gained: result.coins_gained,
    shop: buildPatrolShopResponse(user),
  };
}

export async function sellPatrolMaterialsByRarity(
  userId: string,
  rarity: SlimeMaterialRarity | 'all',
) {
  const user = await User.findById(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const stocked = readSlimeMaterialStock(user).filter(
    (material) => material.quantity > 0 && (rarity === 'all' || material.rarity === rarity),
  );
  if (stocked.length === 0) {
    return { error: 'Nenhum material desta raridade para vender.', status: 400 as const };
  }

  let quantitySold = 0;
  let coinsGained = 0;
  for (const material of stocked) {
    const result = sellSlimeMaterialFromInventory(user, material.id, 'all');
    if (!result.ok) continue;
    quantitySold += result.quantity_sold;
    coinsGained += result.coins_gained;
  }

  await user.save({ profileColumns: ['inventario', 'cosmeticos'] });
  return {
    user,
    quantity_sold: quantitySold,
    coins_gained: coinsGained,
    shop: buildPatrolShopResponse(user),
  };
}

export { patrolHeroDamage, PATROL_WEAPON_RARITY_LABELS };
