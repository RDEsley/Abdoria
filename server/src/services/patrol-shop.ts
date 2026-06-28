import {
  AFK_CRIT_STREAK_STEP_ARCO,
  AFK_LEVEL10_BOW_CRIT_CHANCE,
  AFK_LEVEL10_SWORD_CRIT_CHANCE,
  CURRENCY_NAME,
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
import type { UserDocument } from '../types/user-document.js';
import { User } from '../domain/User.js';
import { readAbdoriaBalance } from './economy.js';

function ensurePatrolArmas(user: UserMutable): PatrolArmasState {
  const resolved = resolvePatrolArmas(user.preferencias.patrol_armas);
  user.preferencias.patrol_armas = resolved;
  return resolved;
}

function unlockLabel(def: PatrolWeaponDefinition, desbloqueada: boolean): string {
  if (desbloqueada) return 'Desbloqueado';
  if (def.unlock.tipo === 'gratis') return 'Grátis';
  if (def.unlock.tipo === 'futuro') return 'Em breve';
  return `${def.unlock.preco_moedas} ${CURRENCY_NAME}`;
}

function toCatalogItem(
  def: PatrolWeaponDefinition,
  armas: PatrolArmasState,
  abdoria: number,
  armaPreferida: 'arco' | 'espada',
): PatrolShopCatalogItem {
  const desbloqueada = armas.desbloqueados.includes(def.id);
  const slotEquipped =
    def.kind === 'arco'
      ? armas.arco_equipado === def.id
      : def.kind === 'espada'
        ? armas.espada_equipada === def.id
        : false;
  const equipada = slotEquipped && def.kind === armaPreferida;
  const futuro = def.unlock.tipo === 'futuro';
  const pode_comprar =
    !desbloqueada &&
    !futuro &&
    def.unlock.tipo === 'moedas' &&
    abdoria >= def.unlock.preco_moedas;
  const weaponKind = def.kind === 'arco' ? 'arco' : 'espada';
  const dano_total = patrolHeroDamage(weaponKind, def.id);
  // Armas Secret (nível 10) exibem o crítico especial contra elites/bosses.
  const chance_critico =
    def.nivel === 10
      ? weaponKind === 'arco'
        ? AFK_LEVEL10_BOW_CRIT_CHANCE
        : AFK_LEVEL10_SWORD_CRIT_CHANCE
      : patrolCritChance(weaponKind);

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
    crit_bonus: weaponKind === 'arco' ? AFK_CRIT_STREAK_STEP_ARCO : 4,
    dano_critico: patrolCritDamage(dano_total, weaponKind, 0),
    chance_critico,
  };
}

export function buildPatrolShopResponse(user: UserDocument): PatrolShopResponse {
  const cosmeticos = resolveCosmeticos(user.cosmeticos, user.gamificacao.nivel_xp);
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const abdoria = readAbdoriaBalance(user);
  const armaPreferida = user.preferencias?.arma_preferida === 'espada' ? 'espada' : 'arco';

  return {
    abdoria,
    armas,
    arma_preferida: armaPreferida,
    arcos: patrolWeaponsByKind('arco').map((def) => toCatalogItem(def, armas, abdoria, armaPreferida)),
    espadas: patrolWeaponsByKind('espada').map((def) => toCatalogItem(def, armas, abdoria, armaPreferida)),
  };
}

export async function loadUserForPatrolShop(userId: string) {
  return User.findById(userId);
}

export async function purchasePatrolWeapon(userId: string, itemId: string) {
  const user = await User.findById(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const def = PATROL_WEAPON_BY_ID[itemId];
  if (!def || def.kind === 'magia') {
    return { error: 'Item não encontrado.', status: 404 as const };
  }
  if (def.unlock.tipo === 'futuro') {
    return { error: 'Este item ainda não está disponível.', status: 400 as const };
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
    return { error: `${CURRENCY_NAME} insuficientes. Faltam ${preco - cosmeticos.moedas} ${CURRENCY_NAME}.`, status: 400 as const };
  }

  cosmeticos.moedas -= preco;
  user.cosmeticos = cosmeticos;
  armas.desbloqueados.push(itemId);
  if (def.kind === 'arco') armas.arco_equipado = itemId;
  if (def.kind === 'espada') armas.espada_equipada = itemId;
  user.preferencias.patrol_armas = armas;
  user.preferencias.arma_preferida = def.kind;

  await user.save();

  return {
    user,
    item: toCatalogItem(def, armas, cosmeticos.moedas, def.kind),
    abdoria_gasta: preco,
  };
}

export async function equipPatrolWeapon(userId: string, kind: PatrolWeaponKind, itemId: string) {
  if (kind !== 'arco' && kind !== 'espada') {
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
  else armas.espada_equipada = itemId;

  user.preferencias.patrol_armas = armas;
  user.preferencias.arma_preferida = kind;
  await user.save();

  return { user, item: def };
}

export { patrolHeroDamage, PATROL_WEAPON_RARITY_LABELS };
