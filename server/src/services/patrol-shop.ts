import {
  AFK_HERO_DAMAGE_ARCO,
  AFK_HERO_DAMAGE_ESPADA,
  CURRENCY_NAME,
  type PatrolArmasState,
  type PatrolShopCatalogItem,
  type PatrolShopResponse,
  type PatrolWeaponDefinition,
  type PatrolWeaponKind,
  patrolWeaponsByKind,
  patrolHeroDamage,
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
): PatrolShopCatalogItem {
  const desbloqueada = armas.desbloqueados.includes(def.id);
  const equipada =
    def.kind === 'arco'
      ? armas.arco_equipado === def.id
      : def.kind === 'espada'
        ? armas.espada_equipada === def.id
        : false;
  const futuro = def.unlock.tipo === 'futuro';
  const pode_comprar =
    !desbloqueada &&
    !futuro &&
    def.unlock.tipo === 'moedas' &&
    abdoria >= def.unlock.preco_moedas;
  const base = def.kind === 'arco' ? AFK_HERO_DAMAGE_ARCO : AFK_HERO_DAMAGE_ESPADA;

  return {
    id: def.id,
    kind: def.kind,
    nome: def.nome,
    descricao: def.descricao,
    raridade: def.raridade,
    desbloqueada,
    equipada,
    pode_comprar,
    futuro,
    unlock_label: unlockLabel(def, desbloqueada),
    unlock: def.unlock,
    dano_bonus: def.dano_bonus,
    dano_total: base + def.dano_bonus,
  };
}

export function buildPatrolShopResponse(user: UserDocument): PatrolShopResponse {
  const cosmeticos = resolveCosmeticos(user.cosmeticos, user.gamificacao.nivel_xp);
  const armas = resolvePatrolArmas(user.preferencias?.patrol_armas);
  const abdoria = readAbdoriaBalance(user);

  return {
    abdoria,
    armas,
    arma_preferida: user.preferencias?.arma_preferida === 'espada' ? 'espada' : 'arco',
    arcos: patrolWeaponsByKind('arco').map((def) => toCatalogItem(def, armas, abdoria)),
    espadas: patrolWeaponsByKind('espada').map((def) => toCatalogItem(def, armas, abdoria)),
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
    return { error: `Abdoria insuficiente. Faltam ${preco - cosmeticos.moedas} ${CURRENCY_NAME}.`, status: 400 as const };
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
    item: toCatalogItem(def, armas, cosmeticos.moedas),
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
