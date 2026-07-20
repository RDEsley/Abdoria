import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import {
  GIFT_CODE_BY_KEY,
  hasGiftCodeRewards,
  isGiftCodeExpired,
  type GiftCodeDefinition,
} from '../data/gift-codes.js';
import { COSMETIC_BY_ID, COSMETICS, DEFAULT_BORDA_ID } from '../data/cosmetics.js';
import { allExercises } from '../db/seeds/all-exercises.js';
import { User } from '../domain/User.js';
import type { UserMutable } from '../repositories/user-repository.js';
import type { CosmeticDefinition, CosmeticKind, ShopCatalogItem, ShopResponse } from '../types/index.js';
import {
  MOEDA_XP_STEP,
  CURRENCY_NAME,
  ADMIN_MOLDURA_ID,
  FROZEN_STREAK_ITEM_ID,
  SHOP_HIDDEN_COSMETIC_IDS,
  DEFAULT_COSMETICOS,
  SHOP_MOEDA_COST_PER_XP,
  SHOP_XP_COST_PER_MOEDA,
  mergeUserDadosSalvos,
  resolveCosmeticos,
  resolveUserDadosSalvos,
  sortCosmeticCatalogItems,
  spendableXpForShop,
  xpLevelFromTotal,
} from '../types/index.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import {
  giftCodeFormatError,
  isValidGiftCodeFormat,
  normalizeGiftCode,
} from '../utils/gift-code.js';
import {
  awardMoedaFromXp,
  awardDailyXp,
  ensureMoedaWallet,
  grantMoeda,
  readMoedaBalance,
} from './economy.js';
import { addInventoryItem } from './inventory.js';

export { COSMETICS, COSMETIC_BY_ID, CURRENCY_NAME };

type UserDoc = UserMutable;

const DEFAULT_SOM_ID = 'som_classico';
const DEFAULT_EFEITO_ID = 'efeito_padrao';

function cosmeticosSnapshot(user: UserDoc): Partial<typeof DEFAULT_COSMETICOS> {
  const raw = user.cosmeticos;
  if (!raw || typeof raw !== 'object') return {};
  const maybeDoc = raw as { toObject?: () => Partial<typeof DEFAULT_COSMETICOS> };
  if (typeof maybeDoc.toObject === 'function') {
    return maybeDoc.toObject();
  }
  return { ...(raw as Partial<typeof DEFAULT_COSMETICOS>) };
}

function ensureCosmeticos(user: UserDoc): void {
  const snapshot = cosmeticosSnapshot(user);
  const resolved = resolveCosmeticos(snapshot, user.gamificacao.nivel_xp);
  ensureMoedaWallet(user);

  if (typeof snapshot.moedas === 'number' && !Number.isNaN(snapshot.moedas)) {
    resolved.moedas = Math.max(resolved.moedas, snapshot.moedas);
  }
  if (typeof snapshot.moedas_xp_blocos === 'number' && !Number.isNaN(snapshot.moedas_xp_blocos)) {
    resolved.moedas_xp_blocos = Math.max(resolved.moedas_xp_blocos, snapshot.moedas_xp_blocos);
  }

  user.cosmeticos = resolved as typeof user.cosmeticos;
}

/**
 * Sons continuam à venda por Dorias (aba Áudio das Opções). Os demais
 * cosméticos com regra legada `moedas` (Personalização do Perfil) saíram
 * de venda — decisão de produto de 2026-07-18: passam a ser obtidos por
 * conquistas, códigos e eventos, sem preço exposto na interface.
 */
function moedasUnlockLabel(item: CosmeticDefinition): string {
  if (item.kind === 'som') {
    const price = item.unlock.preco_moedas ?? 0;
    return `${price} ${CURRENCY_NAME}`;
  }
  if (item.raridade === 'lendario' || item.raridade === 'epico') {
    return 'Drop raro na Exploração AFK';
  }
  return 'Em breve — nova forma de desbloquear';
}

export function buildUnlockLabel(item: CosmeticDefinition): string {
  switch (item.unlock.tipo) {
    case 'gratis':
      return 'Grátis para todos';
    case 'nivel':
      return `Alcance o nível ${item.unlock.nivel_min ?? '?'}`;
    case 'conquista': {
      const ach = item.unlock.conquista_id
        ? ACHIEVEMENT_BY_ID[item.unlock.conquista_id]
        : undefined;
      return ach ? `Conquista: ${ach.titulo}` : 'Complete uma conquista especial';
    }
    case 'moedas':
      return moedasUnlockLabel(item);
    case 'codigo':
      return 'Resgate um código presente em Opções';
    default:
      return 'Desbloqueio especial';
  }
}

function isAutoUnlockEligible(
  item: CosmeticDefinition,
  level: number,
  conquistas: Set<string>,
): boolean {
  const { tipo, nivel_min, conquista_id } = item.unlock;
  if (tipo === 'gratis') return true;
  if (tipo === 'nivel' && nivel_min != null && level >= nivel_min) return true;
  if (tipo === 'conquista' && conquista_id && conquistas.has(conquista_id)) return true;
  return false;
}

/** Moldura de admin: concedida ao virar admin (por qualquer via) e revogada
    ao deixar de ser — nunca fica visível/equipada em conta comum. */
export function syncAdminMoldura(user: UserDoc): void {
  if (user.role === undefined) return; // coluna role ainda não migrada
  const unlocked = new Set(user.cosmeticos.desbloqueados);
  const isAdmin = user.role === 'admin';

  if (isAdmin && !unlocked.has(ADMIN_MOLDURA_ID)) {
    unlocked.add(ADMIN_MOLDURA_ID);
    user.cosmeticos.desbloqueados = [...unlocked];
  }
  if (!isAdmin && unlocked.has(ADMIN_MOLDURA_ID)) {
    unlocked.delete(ADMIN_MOLDURA_ID);
    user.cosmeticos.desbloqueados = [...unlocked];
    if (user.cosmeticos.moldura_loja_equipada === ADMIN_MOLDURA_ID) {
      user.cosmeticos.moldura_loja_equipada = DEFAULT_BORDA_ID;
    }
  }
}

export function syncShopUnlocks(user: UserDoc): void {
  ensureCosmeticos(user);
  syncAdminMoldura(user);
  const level = xpLevelFromTotal(user.gamificacao.nivel_xp);
  const conquistas = new Set(user.gamificacao.conquistas);
  const unlocked = new Set(user.cosmeticos.desbloqueados);

  for (const item of COSMETICS) {
    if (unlocked.has(item.id)) continue;
    if ((SHOP_HIDDEN_COSMETIC_IDS as readonly string[]).includes(item.id)) continue;
    if (item.unlock.tipo === 'afk_secreto' || item.unlock.tipo === 'golden_slime') continue;
    if (isAutoUnlockEligible(item, level, conquistas)) unlocked.add(item.id);
  }

  user.cosmeticos.desbloqueados = [...unlocked];

  if (!unlocked.has(user.cosmeticos.moldura_loja_equipada))
    user.cosmeticos.moldura_loja_equipada = DEFAULT_BORDA_ID;
  if (!unlocked.has(user.cosmeticos.som_equipado)) user.cosmeticos.som_equipado = DEFAULT_SOM_ID;
  if (!unlocked.has(user.cosmeticos.efeito_equipado))
    user.cosmeticos.efeito_equipado = DEFAULT_EFEITO_ID;
  if (!unlocked.has(user.cosmeticos.banner_equipado))
    user.cosmeticos.banner_equipado = 'fundo_padrao';
  if (user.cosmeticos.titulo_equipado && !unlocked.has(user.cosmeticos.titulo_equipado)) {
    user.cosmeticos.titulo_equipado = null;
  }
}

function isEquipped(user: UserDoc, item: CosmeticDefinition): boolean {
  switch (item.kind) {
    case 'moldura_loja':
      return user.cosmeticos.moldura_loja_equipada === item.id;
    case 'titulo':
      return user.cosmeticos.titulo_equipado === item.id;
    case 'som':
      return user.cosmeticos.som_equipado === item.id;
    case 'efeito':
      return user.cosmeticos.efeito_equipado === item.id;
    case 'banner':
      return user.cosmeticos.banner_equipado === item.id;
    default:
      return false;
  }
}

function toCatalogItem(item: CosmeticDefinition, user: UserDoc): ShopCatalogItem {
  const unlocked = new Set(user.cosmeticos.desbloqueados);
  const desbloqueada = unlocked.has(item.id);
  const equipada = isEquipped(user, item);
  // Só sons continuam compráveis por moedas — Personalização do Perfil saiu
  // de venda (itens agora vêm de conquistas, códigos e eventos).
  const pode_comprar =
    !desbloqueada &&
    item.kind === 'som' &&
    item.unlock.tipo === 'moedas' &&
    (item.unlock.preco_moedas ?? 0) <= readMoedaBalance(user);

  return {
    ...item,
    desbloqueada,
    equipada,
    pode_comprar,
    unlock_label: buildUnlockLabel(item),
  };
}

export function buildShopResponse(user: UserDoc): ShopResponse {
  ensureCosmeticos(user);
  syncShopUnlocks(user);

  const byKind = (kind: CosmeticKind) =>
    sortCosmeticCatalogItems(
      COSMETICS.filter(
        (item) =>
          item.kind === kind && !(SHOP_HIDDEN_COSMETIC_IDS as readonly string[]).includes(item.id),
      ).map((item) => toCatalogItem(item, user)),
    );

  return {
    abdoria: readMoedaBalance(user),
    xp_level: xpLevelFromTotal(user.gamificacao.nivel_xp),
    nivel_xp: user.gamificacao.nivel_xp,
    spendable_xp: spendableXpForShop(user.gamificacao.nivel_xp),
    shop_xp_cost_per_abdoria: SHOP_XP_COST_PER_MOEDA,
    shop_abdoria_cost_per_xp: SHOP_MOEDA_COST_PER_XP,
    xp_to_abdoria_rate: SHOP_XP_COST_PER_MOEDA,
    abdoria_to_xp_rate: SHOP_MOEDA_COST_PER_XP,
    abdoria_por_xp: MOEDA_XP_STEP,
    moldura_loja_equipada: user.cosmeticos.moldura_loja_equipada,
    titulo_equipado: user.cosmeticos.titulo_equipado ?? null,
    som_equipado: user.cosmeticos.som_equipado,
    efeito_equipado: user.cosmeticos.efeito_equipado,
    banner_equipado: user.cosmeticos.banner_equipado,
    molduras_loja: byKind('moldura_loja'),
    titulos: byKind('titulo'),
    sons: byKind('som'),
    efeitos: byKind('efeito'),
    banners: byKind('banner'),
  };
}

export async function loadUserForShop(userId: string): Promise<UserDoc | null> {
  const user = await User.findById(userId);
  if (!user) return null;
  ensureCosmeticos(user);
  syncShopUnlocks(user);
  await user.save();
  return user;
}

export function awardMoedaFromXpProgress(user: UserDoc): number {
  ensureCosmeticos(user);
  return awardMoedaFromXp(user);
}

export async function purchaseShopItem(userId: string, itemId: string) {
  const user = await loadUserForShop(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const item = COSMETIC_BY_ID[itemId];
  if (!item) return { error: 'Item não encontrado.', status: 404 as const };
  if (item.unlock.tipo !== 'moedas')
    return { error: 'Este item não está à venda.', status: 400 as const };
  if (item.kind !== 'som') {
    return {
      error: 'Este item não está mais à venda — desbloqueie por conquistas, códigos ou eventos.',
      status: 400 as const,
    };
  }

  const price = item.unlock.preco_moedas ?? 0;
  const unlocked = new Set(user.cosmeticos.desbloqueados);
  if (unlocked.has(item.id)) return { error: 'Você já possui este item.', status: 400 as const };
  ensureMoedaWallet(user);
  const balance = readMoedaBalance(user);
  if (balance < price) return { error: `${CURRENCY_NAME} insuficientes.`, status: 400 as const };

  user.cosmeticos.moedas = balance - price;
  unlocked.add(item.id);
  user.cosmeticos.desbloqueados = [...unlocked];
  await user.save();

  return { user, item: toCatalogItem(item, user), abdoria_gasta: price };
}

export async function equipShopItem(userId: string, kind: CosmeticKind, itemId: string) {
  const user = await loadUserForShop(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const item = COSMETIC_BY_ID[itemId];
  if (!item || item.kind !== kind) return { error: 'Item inválido.', status: 400 as const };
  if (!user.cosmeticos.desbloqueados.includes(item.id)) {
    return { error: 'Desbloqueie o item antes de equipar.', status: 400 as const };
  }

  switch (kind) {
    case 'moldura_loja':
      user.cosmeticos.moldura_loja_equipada = item.id;
      break;
    case 'titulo':
      user.cosmeticos.titulo_equipado = item.id;
      break;
    case 'som':
      user.cosmeticos.som_equipado = item.id;
      break;
    case 'efeito':
      user.cosmeticos.efeito_equipado = item.id;
      break;
    case 'banner':
      user.cosmeticos.banner_equipado = item.id;
      break;
    default:
      return { error: 'Tipo inválido.', status: 400 as const };
  }

  await user.save();
  return { user, item: toCatalogItem(item, user) };
}

/** Código master de dev/dono: desbloqueia literalmente tudo (cosméticos + exercícios). */
const MASTER_UNLOCK_CODE = 'violadearco';

async function redeemMasterUnlockCode(user: UserDoc) {
  const redeemed = new Set(user.cosmeticos.codigos_resgatados ?? []);
  if (redeemed.has(MASTER_UNLOCK_CODE)) {
    return { error: 'Você já resgatou este código nesta conta.', status: 400 as const };
  }
  redeemed.add(MASTER_UNLOCK_CODE);
  user.cosmeticos.codigos_resgatados = [...redeemed];

  const todosCosmeticos = COSMETICS.map((item) => item.id);
  user.cosmeticos.desbloqueados = todosCosmeticos;
  syncGiftCodeAbdoriaBlocks(user);

  const todosExercicios = allExercises.map((ex) => ex.slug);
  user.dados_salvos = mergeUserDadosSalvos(resolveUserDadosSalvos(user.dados_salvos), {
    exercicios_desbloqueados: todosExercicios,
  });

  await user.save();

  return {
    user,
    codigo: MASTER_UNLOCK_CODE,
    xp_ganho: 0,
    abdoria_ganha: 0,
    itens_desbloqueados: todosCosmeticos,
    titulo: undefined as string | undefined,
    mensagem: `Tudo desbloqueado: ${todosCosmeticos.length} cosméticos e ${todosExercicios.length} exercícios.`,
    recompensas: [{ tipo: 'cosmetico' as const, nome: 'Absolutamente tudo' }],
  };
}

export async function redeemGiftCode(userId: string, rawCode: string) {
  const user = await loadUserForShop(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const code = normalizeGiftCode(rawCode);
  if (!isValidGiftCodeFormat(code)) {
    return { error: giftCodeFormatError(), status: 400 as const };
  }

  if (code === MASTER_UNLOCK_CODE) {
    return redeemMasterUnlockCode(user);
  }

  const definition = GIFT_CODE_BY_KEY[code];
  if (!definition || definition.active === false) {
    return { error: 'Código inválido ou expirado.', status: 404 as const };
  }

  if (!hasGiftCodeRewards(definition)) {
    return { error: 'Este código não possui recompensas configuradas.', status: 400 as const };
  }

  if (isGiftCodeExpired(definition, getTodaySaoPaulo())) {
    return { error: 'Este código expirou.', status: 400 as const };
  }

  const redeemed = new Set(user.cosmeticos.codigos_resgatados ?? []);
  if (redeemed.has(code)) {
    return { error: 'Você já resgatou este código nesta conta.', status: 400 as const };
  }

  redeemed.add(code);
  user.cosmeticos.codigos_resgatados = [...redeemed];

  const xp_ganho = awardDailyXp(user, definition.xp);
  grantMoeda(user, definition.abdoria);
  syncGiftCodeAbdoriaBlocks(user);

  if (definition.frozen_streaks && definition.frozen_streaks > 0) {
    addInventoryItem(user, FROZEN_STREAK_ITEM_ID, definition.frozen_streaks);
  }
  // Coluna gems pode não existir ainda em contas cuja migração não foi aplicada.
  if (definition.gems && definition.gems > 0 && user.gems !== undefined) {
    user.gems = (user.gems ?? 0) + definition.gems;
  }

  const unlocked = new Set(user.cosmeticos.desbloqueados);
  for (const itemId of definition.desbloqueia) {
    if (!COSMETIC_BY_ID[itemId]) continue;
    unlocked.add(itemId);
  }
  user.cosmeticos.desbloqueados = [...unlocked];

  if (definition.titulo_equipar && unlocked.has(definition.titulo_equipar)) {
    user.cosmeticos.titulo_equipado = definition.titulo_equipar;
  }

  await user.save();

  const recompensas = buildGiftCodeRewardLines(definition, xp_ganho, definition.abdoria);
  const tituloItem = definition.titulo_equipar
    ? COSMETIC_BY_ID[definition.titulo_equipar]
    : undefined;

  return {
    user,
    codigo: code,
    xp_ganho,
    abdoria_ganha: definition.abdoria,
    itens_desbloqueados: definition.desbloqueia.filter((id) => Boolean(COSMETIC_BY_ID[id])),
    titulo: tituloItem?.nome,
    mensagem: definition.mensagem,
    recompensas,
  };
}

function syncGiftCodeAbdoriaBlocks(user: UserDoc): void {
  user.cosmeticos.moedas_xp_blocos = Math.floor(user.gamificacao.nivel_xp / MOEDA_XP_STEP);
}

function buildGiftCodeRewardLines(
  definition: GiftCodeDefinition,
  xp_ganho: number,
  abdoria_ganha: number,
) {
  const lines: Array<{
    tipo: 'xp' | 'abdoria' | 'cosmetico' | 'frozen_streak' | 'gems';
    valor?: number;
    nome?: string;
    item_id?: string;
  }> = [];

  if (xp_ganho > 0) lines.push({ tipo: 'xp', valor: xp_ganho });
  if (abdoria_ganha > 0) lines.push({ tipo: 'abdoria', valor: abdoria_ganha });
  if (definition.frozen_streaks && definition.frozen_streaks > 0) {
    lines.push({ tipo: 'frozen_streak', valor: definition.frozen_streaks });
  }
  if (definition.gems && definition.gems > 0) {
    lines.push({ tipo: 'gems', valor: definition.gems });
  }

  for (const itemId of definition.desbloqueia) {
    const item = COSMETIC_BY_ID[itemId];
    if (!item) continue;
    lines.push({ tipo: 'cosmetico', item_id: itemId, nome: item.nome });
  }

  return lines;
}

/** Compatibilidade com serviço anterior. */
export const syncCosmeticUnlocks = syncShopUnlocks;
export const awardLevelCoins = awardMoedaFromXpProgress;
export function buildCosmeticsResponse(
  user: UserDoc,
): ShopResponse & { moedas: number; moedas_por_nivel: number } {
  const shop = buildShopResponse(user);
  return {
    ...shop,
    moedas: shop.abdoria,
    moedas_por_nivel: shop.abdoria_por_xp,
  };
}
export const purchaseCosmetic = purchaseShopItem;
export const equipCosmetic = equipShopItem;
export const loadUserForCosmetics = loadUserForShop;
