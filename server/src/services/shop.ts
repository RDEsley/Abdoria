import type { HydratedDocument } from 'mongoose';
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import {
  PAID_OFFER_CONFIG,
  paidOfferAbdoriaCost,
  paidOfferXpCost,
  pickDailyRarity,
  pickDailyValue,
  pickDistinctPaidOfferKinds,
  pickFreeDailyRewardType,
  isStaleDailyOffer,
} from '../data/daily-shop-config.js';
import { GIFT_CODE_BY_KEY, hasGiftCodeRewards, isGiftCodeExpired, type GiftCodeDefinition } from '../data/gift-codes.js';
import {
  COSMETIC_BY_ID,
  COSMETICS,
  DEFAULT_AVATAR_ID,
  DEFAULT_BORDA_ID,
} from '../data/cosmetics.js';
import { User, type UserDocument } from '../models/User.js';
import type {
  CosmeticDefinition,
  CosmeticKind,
  DailyRewardRarity,
  DailyShopSlotKind,
  LojaDiaria,
  LojaDiariaSlot,
  ShopCatalogItem,
  ShopResponse,
} from '../types/index.js';
import {
  ABDORIA_XP_STEP,
  CURRENCY_NAME,
  DEFAULT_COSMETICOS,
  DAILY_PAID_OFFER_LABELS,
  DAILY_RARITY_LABELS,
  SHOP_ABDORIA_COST_PER_XP,
  SHOP_XP_COST_PER_ABDORIA,
  resolveCosmeticos,
  spendableXpForShop,
  xpLevelFromTotal,
} from '../types/index.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { giftCodeFormatError, isValidGiftCodeFormat, normalizeGiftCode } from '../utils/gift-code.js';
import { awardAbdoriaFromXp, awardBonusXp, ensureAbdoriaWallet, grantAbdoria, projectedAbdoriaAfterXpSpend, readAbdoriaBalance, spendXpForShop } from './economy.js';

export { COSMETICS, COSMETIC_BY_ID, CURRENCY_NAME };

type UserDoc = HydratedDocument<UserDocument>;

const DEFAULT_SOM_ID = 'som_classico';
const DEFAULT_EFEITO_ID = 'efeito_padrao';

const lojaDiariaSchemaDefaults = (): LojaDiaria => ({
  data_reset: '',
  slots: [],
});

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
  ensureAbdoriaWallet(user);

  if (typeof snapshot.moedas === 'number' && !Number.isNaN(snapshot.moedas)) {
    resolved.moedas = Math.max(resolved.moedas, snapshot.moedas);
  }
  if (typeof snapshot.moedas_xp_blocos === 'number' && !Number.isNaN(snapshot.moedas_xp_blocos)) {
    resolved.moedas_xp_blocos = Math.max(resolved.moedas_xp_blocos, snapshot.moedas_xp_blocos);
  }

  user.cosmeticos = resolved as typeof user.cosmeticos;
  user.markModified('cosmeticos');
}

function ensureLojaDiaria(user: UserDoc): LojaDiaria & { slots: LojaDiariaSlot[] } {
  if (!user.loja_diaria || typeof user.loja_diaria !== 'object') {
    user.loja_diaria = lojaDiariaSchemaDefaults() as never;
  }
  return user.loja_diaria as LojaDiaria & { slots: LojaDiariaSlot[] };
}

export function buildUnlockLabel(item: CosmeticDefinition): string {
  switch (item.unlock.tipo) {
    case 'gratis':
      return 'Padrão';
    case 'nivel':
      return `Nível ${item.unlock.nivel_min ?? '?'}`;
    case 'conquista': {
      const ach = item.unlock.conquista_id ? ACHIEVEMENT_BY_ID[item.unlock.conquista_id] : undefined;
      return ach ? `Conquista: ${ach.titulo}` : 'Conquista especial';
    }
    case 'moedas':
      return `${item.unlock.preco_moedas ?? 0} ${CURRENCY_NAME}`;
    case 'codigo':
      return 'Código presente';
    default:
      return 'Desbloqueio especial';
  }
}

function isAutoUnlockEligible(item: CosmeticDefinition, level: number, conquistas: Set<string>): boolean {
  const { tipo, nivel_min, conquista_id } = item.unlock;
  if (tipo === 'gratis') return true;
  if (tipo === 'nivel' && nivel_min != null && level >= nivel_min) return true;
  if (tipo === 'conquista' && conquista_id && conquistas.has(conquista_id)) return true;
  return false;
}

export function syncShopUnlocks(user: UserDoc): void {
  ensureCosmeticos(user);
  const level = xpLevelFromTotal(user.gamificacao.nivel_xp);
  const conquistas = new Set(user.gamificacao.conquistas);
  const unlocked = new Set(user.cosmeticos.desbloqueados);

  for (const item of COSMETICS) {
    if (unlocked.has(item.id)) continue;
    if (isAutoUnlockEligible(item, level, conquistas)) unlocked.add(item.id);
  }

  user.cosmeticos.desbloqueados = [...unlocked];

  if (!unlocked.has(user.cosmeticos.avatar_equipado)) user.cosmeticos.avatar_equipado = DEFAULT_AVATAR_ID;
  if (!unlocked.has(user.cosmeticos.borda_equipada)) user.cosmeticos.borda_equipada = DEFAULT_BORDA_ID;
  if (!unlocked.has(user.cosmeticos.som_equipado)) user.cosmeticos.som_equipado = DEFAULT_SOM_ID;
  if (!unlocked.has(user.cosmeticos.efeito_equipado)) user.cosmeticos.efeito_equipado = DEFAULT_EFEITO_ID;
  if (user.cosmeticos.titulo_equipado && !unlocked.has(user.cosmeticos.titulo_equipado)) {
    user.cosmeticos.titulo_equipado = null;
  }
}

function buildSlotLabel(slot: Pick<LojaDiariaSlot, 'kind' | 'recompensa_tipo' | 'valor' | 'raridade' | 'oferta_nome' | 'bonus_xp' | 'bonus_abdoria'>): string {
  const rarity = DAILY_RARITY_LABELS[slot.raridade];

  if (slot.kind === 'recompensa_diaria') {
    const reward =
      slot.recompensa_tipo === 'xp' ? `+${slot.valor} XP` : `+${slot.valor} ${CURRENCY_NAME}`;
    return `Recompensa diária · ${rarity} · ${reward}`;
  }

  if (slot.recompensa_tipo === 'pacote') {
    return `${slot.oferta_nome ?? 'Pacote misto'} · ${rarity} · +${slot.bonus_xp ?? 0} XP · +${slot.bonus_abdoria ?? 0} ${CURRENCY_NAME}`;
  }

  const reward =
    slot.recompensa_tipo === 'xp' ? `+${slot.valor} XP` : `+${slot.valor} ${CURRENCY_NAME}`;
  return `${slot.oferta_nome ?? 'Oferta'} · ${rarity} · ${reward}`;
}

function generateFreeDailySlot(date: string, slot: number): LojaDiariaSlot {
  const raridade = pickDailyRarity(date, slot);
  const recompensa_tipo = pickFreeDailyRewardType(date, slot);
  const valor = pickDailyValue(date, slot, recompensa_tipo, raridade, 'recompensa_diaria');

  const draft: LojaDiariaSlot = {
    slot,
    kind: 'recompensa_diaria',
    recompensa_tipo,
    valor,
    raridade,
    preco_abdoria: 0,
    resgatado: false,
    label: '',
  };
  draft.label = buildSlotLabel(draft);
  return draft;
}

function generatePaidDailySlot(date: string, slot: number, offerKind: keyof typeof PAID_OFFER_CONFIG): LojaDiariaSlot {
  const raridade = pickDailyRarity(date, slot);
  const config = PAID_OFFER_CONFIG[offerKind][raridade];
  const oferta_nome = DAILY_PAID_OFFER_LABELS[offerKind];

  if (offerKind === 'pacote_misto') {
    const draft: LojaDiariaSlot = {
      slot,
      kind: 'oferta',
      recompensa_tipo: 'pacote',
      valor: 0,
      raridade,
      preco_abdoria: paidOfferAbdoriaCost(offerKind, raridade),
      preco_xp: paidOfferXpCost(offerKind, raridade),
      bonus_xp: config.bonus_xp ?? 0,
      bonus_abdoria: config.bonus_abdoria ?? 0,
      oferta_nome,
      resgatado: false,
      label: '',
    };
    draft.label = buildSlotLabel(draft);
    return draft;
  }

  const recompensa_tipo = offerKind === 'surto_xp' ? 'xp' : 'abdoria';
  const valor = offerKind === 'surto_xp' ? (config.xp ?? 0) : (config.abdoria ?? 0);
  const draft: LojaDiariaSlot = {
    slot,
    kind: 'oferta',
    recompensa_tipo,
    valor,
    raridade,
    preco_abdoria: paidOfferAbdoriaCost(offerKind, raridade),
    preco_xp: paidOfferXpCost(offerKind, raridade),
    oferta_nome,
    resgatado: false,
    label: '',
  };
  draft.label = buildSlotLabel(draft);
  return draft;
}

function isLegacyDailyOffer(slot: LojaDiariaSlot): boolean {
  return isStaleDailyOffer(slot);
}

export function syncDailyShop(user: UserDoc): LojaDiaria {
  const today = getTodaySaoPaulo();
  const loja = ensureLojaDiaria(user);

  const shouldRegenerate =
    loja.data_reset !== today ||
    loja.slots.length !== 3 ||
    loja.slots.some((entry) => isLegacyDailyOffer(entry as LojaDiariaSlot));

  if (!shouldRegenerate) {
    return {
      data_reset: loja.data_reset,
      slots: [...loja.slots] as LojaDiariaSlot[],
    };
  }

  const [offerKindSlot1, offerKindSlot2] = pickDistinctPaidOfferKinds(today);
  const slots = [
    generateFreeDailySlot(today, 0),
    generatePaidDailySlot(today, 1, offerKindSlot1),
    generatePaidDailySlot(today, 2, offerKindSlot2),
  ];

  loja.data_reset = today;
  loja.slots.splice(0, loja.slots.length, ...(slots as never[]));

  return { data_reset: today, slots };
}

function isEquipped(user: UserDoc, item: CosmeticDefinition): boolean {
  switch (item.kind) {
    case 'avatar':
      return user.cosmeticos.avatar_equipado === item.id;
    case 'borda':
      return user.cosmeticos.borda_equipada === item.id;
    case 'titulo':
      return user.cosmeticos.titulo_equipado === item.id;
    case 'som':
      return user.cosmeticos.som_equipado === item.id;
    case 'efeito':
      return user.cosmeticos.efeito_equipado === item.id;
    default:
      return false;
  }
}

function toCatalogItem(item: CosmeticDefinition, user: UserDoc): ShopCatalogItem {
  const unlocked = new Set(user.cosmeticos.desbloqueados);
  const desbloqueada = unlocked.has(item.id);
  const equipada = isEquipped(user, item);
  const pode_comprar =
    !desbloqueada && item.unlock.tipo === 'moedas' && (item.unlock.preco_moedas ?? 0) <= readAbdoriaBalance(user);

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
  const loja_diaria = syncDailyShop(user);

  const byKind = (kind: CosmeticKind) =>
    COSMETICS.filter((item) => item.kind === kind).map((item) => toCatalogItem(item, user));

  return {
    abdoria: readAbdoriaBalance(user),
    xp_level: xpLevelFromTotal(user.gamificacao.nivel_xp),
    nivel_xp: user.gamificacao.nivel_xp,
    spendable_xp: spendableXpForShop(user.gamificacao.nivel_xp),
    shop_xp_cost_per_abdoria: SHOP_XP_COST_PER_ABDORIA,
    shop_abdoria_cost_per_xp: SHOP_ABDORIA_COST_PER_XP,
    xp_to_abdoria_rate: SHOP_XP_COST_PER_ABDORIA,
    abdoria_to_xp_rate: SHOP_ABDORIA_COST_PER_XP,
    abdoria_por_xp: ABDORIA_XP_STEP,
    avatar_equipado: user.cosmeticos.avatar_equipado,
    borda_equipada: user.cosmeticos.borda_equipada,
    titulo_equipado: user.cosmeticos.titulo_equipado ?? null,
    som_equipado: user.cosmeticos.som_equipado,
    efeito_equipado: user.cosmeticos.efeito_equipado,
    avatares: byKind('avatar'),
    bordas: byKind('borda'),
    titulos: byKind('titulo'),
    sons: byKind('som'),
    efeitos: byKind('efeito'),
    loja_diaria,
  };
}

export async function loadUserForShop(userId: string): Promise<UserDoc | null> {
  const user = await User.findById(userId);
  if (!user) return null;
  ensureCosmeticos(user);
  syncShopUnlocks(user);
  syncDailyShop(user);
  await user.save();
  return user;
}

export function awardAbdoriaFromXpProgress(user: UserDoc): number {
  ensureCosmeticos(user);
  return awardAbdoriaFromXp(user);
}

export async function purchaseShopItem(userId: string, itemId: string) {
  const user = await loadUserForShop(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const item = COSMETIC_BY_ID[itemId];
  if (!item) return { error: 'Item não encontrado.', status: 404 as const };
  if (item.unlock.tipo !== 'moedas') return { error: 'Este item não está à venda.', status: 400 as const };

  const price = item.unlock.preco_moedas ?? 0;
  const unlocked = new Set(user.cosmeticos.desbloqueados);
  if (unlocked.has(item.id)) return { error: 'Você já possui este item.', status: 400 as const };
  ensureAbdoriaWallet(user);
  const balance = readAbdoriaBalance(user);
  if (balance < price) return { error: `${CURRENCY_NAME} insuficiente.`, status: 400 as const };

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
    case 'avatar':
      user.cosmeticos.avatar_equipado = item.id;
      break;
    case 'borda':
      user.cosmeticos.borda_equipada = item.id;
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
    default:
      return { error: 'Tipo inválido.', status: 400 as const };
  }

  await user.save();
  return { user, item: toCatalogItem(item, user) };
}

function applyDailyReward(user: UserDoc, slot: LojaDiariaSlot) {
  if (slot.recompensa_tipo === 'pacote') {
    if ((slot.bonus_xp ?? 0) > 0) {
      awardBonusXp(user, slot.bonus_xp ?? 0);
    }
    if ((slot.bonus_abdoria ?? 0) > 0) {
      grantAbdoria(user, slot.bonus_abdoria ?? 0);
    }
    awardAbdoriaFromXp(user);
    return;
  }

  if (slot.recompensa_tipo === 'xp') {
    awardBonusXp(user, slot.valor);
    awardAbdoriaFromXp(user);
    return;
  }

  grantAbdoria(user, slot.valor);
}

export async function claimDailyShopSlot(userId: string, slotIndex: number) {
  const user = await loadUserForShop(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const lojaDoc = ensureLojaDiaria(user);
  syncDailyShop(user);
  const slotDoc = lojaDoc.slots.find((entry) => entry.slot === slotIndex);
  if (!slotDoc) return { error: 'Oferta inválida.', status: 400 as const };
  if (slotDoc.resgatado) return { error: 'Recompensa já resgatada hoje.', status: 400 as const };

  const slotSnapshot: LojaDiariaSlot = {
    slot: slotDoc.slot,
    kind: slotDoc.kind,
    recompensa_tipo: slotDoc.recompensa_tipo,
    valor: slotDoc.valor,
    raridade: slotDoc.raridade,
    preco_abdoria: slotDoc.preco_abdoria,
    preco_xp: slotDoc.preco_xp,
    resgatado: slotDoc.resgatado,
    label: slotDoc.label,
    oferta_nome: slotDoc.oferta_nome,
    bonus_xp: slotDoc.bonus_xp,
    bonus_abdoria: slotDoc.bonus_abdoria,
  };

  if (slotDoc.kind === 'recompensa_diaria') {
    applyDailyReward(user, slotSnapshot);
    slotDoc.resgatado = true;
  } else {
    const abdoriaCost = slotDoc.preco_abdoria ?? 0;
    const xpCost = slotDoc.preco_xp ?? 0;

    ensureAbdoriaWallet(user);

    if (xpCost > 0) {
      const spendable = spendableXpForShop(user.gamificacao.nivel_xp);
      if (xpCost > spendable) {
        return {
          error: `XP insuficiente no progresso do nível. Você pode usar até ${spendable} XP (0–99% do nível atual).`,
          status: 400 as const,
        };
      }
    }

    const abdoriaAfterXp = projectedAbdoriaAfterXpSpend(user, xpCost);
    if (abdoriaCost > 0 && abdoriaAfterXp < abdoriaCost) {
      return { error: `${CURRENCY_NAME} insuficiente.`, status: 400 as const };
    }

    if (xpCost > 0) {
      const spendResult = spendXpForShop(user, xpCost);
      if ('error' in spendResult) {
        return { error: spendResult.error, status: 400 as const };
      }
    }

    if (abdoriaCost > 0) {
      user.cosmeticos.moedas = readAbdoriaBalance(user) - abdoriaCost;
    }

    applyDailyReward(user, slotSnapshot);
    slotDoc.resgatado = true;
  }

  await user.save();

  return {
    user,
    slot: { ...slotSnapshot, resgatado: true },
    loja_diaria: {
      data_reset: lojaDoc.data_reset,
      slots: lojaDoc.slots.map((entry) => ({
        slot: entry.slot,
        kind: entry.kind,
        recompensa_tipo: entry.recompensa_tipo,
        valor: entry.valor,
        raridade: entry.raridade,
        preco_abdoria: entry.preco_abdoria,
        preco_xp: entry.preco_xp,
        resgatado: entry.resgatado,
        label: entry.label,
        oferta_nome: entry.oferta_nome,
        bonus_xp: entry.bonus_xp,
        bonus_abdoria: entry.bonus_abdoria,
      })),
    },
  };
}

export async function redeemGiftCode(userId: string, rawCode: string) {
  const user = await loadUserForShop(userId);
  if (!user) return { error: 'Usuário não encontrado.', status: 404 as const };

  const code = normalizeGiftCode(rawCode);
  if (!isValidGiftCodeFormat(code)) {
    return { error: giftCodeFormatError(), status: 400 as const };
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

  const xp_ganho = awardBonusXp(user, definition.xp);
  grantAbdoria(user, definition.abdoria);
  syncGiftCodeAbdoriaBlocks(user);

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
  const tituloItem = definition.titulo_equipar ? COSMETIC_BY_ID[definition.titulo_equipar] : undefined;

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
  user.cosmeticos.moedas_xp_blocos = Math.floor(user.gamificacao.nivel_xp / ABDORIA_XP_STEP);
}

function buildGiftCodeRewardLines(
  definition: GiftCodeDefinition,
  xp_ganho: number,
  abdoria_ganha: number,
) {
  const lines: Array<{
    tipo: 'xp' | 'abdoria' | 'cosmetico';
    valor?: number;
    nome?: string;
    item_id?: string;
  }> = [];

  if (xp_ganho > 0) lines.push({ tipo: 'xp', valor: xp_ganho });
  if (abdoria_ganha > 0) lines.push({ tipo: 'abdoria', valor: abdoria_ganha });

  for (const itemId of definition.desbloqueia) {
    const item = COSMETIC_BY_ID[itemId];
    if (!item) continue;
    lines.push({ tipo: 'cosmetico', item_id: itemId, nome: item.nome });
  }

  return lines;
}

/** Compatibilidade com serviço anterior. */
export const syncCosmeticUnlocks = syncShopUnlocks;
export const awardLevelCoins = awardAbdoriaFromXpProgress;
export function buildCosmeticsResponse(user: UserDoc): ShopResponse & { moedas: number; moedas_por_nivel: number } {
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
