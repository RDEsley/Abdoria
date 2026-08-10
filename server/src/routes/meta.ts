import { Router } from 'express';
import { User, sanitizeUser } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { awardMoedaFromXp } from '../services/economy.js';
import {
  activateAfk,
  afkProfileColumns,
  claimAfkRewards,
  afkResponsePayload,
  hasAfkRewardsToClaim,
  pauseAfk,
  readFrozenDia,
  resumeAfk,
  syncAfkRewards,
  touchAfkPresence,
} from '../services/afk.js';
import { readBestiaryResponse } from '../services/bestiario.js';
import { DORIA_BAG_LABEL, INVENTORY_STACK_CAP, xpLevelFromTotal } from '../types/index.js';
import {
  readInventarioSummary,
  usePatrolCache,
  useRouteDrinkInExploration,
  useExpInstant,
  useDoriaBag,
} from '../services/inventory.js';
import { getItemCount } from '../services/inventory.js';
import { ROUTE_DRINK_ITEM_ID } from '../types/index.js';
import { defeatCurrentEnemy, ensureCombat } from '../services/afk-combat.js';
import {
  advanceAfkChapter,
  markAfkStoryFlag,
  resetAfkSkillTree,
  selectAfkRegion,
  startAfkAdventure,
  unlockAfkSkill,
} from '../services/afk-adventure.js';

export const metaRouter = Router();

metaRouter.use(requireAuth);

/** Colunas de `profiles` que consumir um item de inventário altera. */
const ITEM_PROFILE_COLUMNS = ['gamificacao', 'inventario', 'cosmeticos'] as const;

metaRouter.get('/afk', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    // Abrir a tela de Exploração é o que liga o timer AFK da conta.
    const frozenDiaAntes = readFrozenDia(user);
    activateAfk(user);
    const bestiario_novos = syncAfkRewards(user);
    await user.save({ profileColumns: afkProfileColumns(user, frozenDiaAntes) });
    res.json(
      afkResponsePayload(
        user,
        {
          arma_preferida: user.preferencias?.arma_preferida ?? 'arco',
          route_drink_count: getItemCount(user, ROUTE_DRINK_ITEM_ID),
        },
        bestiario_novos,
      ),
    );
  } catch (error) {
    console.error('GET /api/meta/afk error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar Exploração.' });
  }
});

metaRouter.post('/afk/claim', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const frozenDiaAntes = readFrozenDia(user);
    const bestiario_novos = syncAfkRewards(user);
    if (!hasAfkRewardsToClaim(user.afk)) {
      res.status(400).json({ error: 'Nenhuma recompensa AFK para coletar.' });
      return;
    }
    const levelBefore = xpLevelFromTotal(user.gamificacao.nivel_xp);
    const { claimed, discarded_items } = claimAfkRewards(user);
    const levelAfter = xpLevelFromTotal(user.gamificacao.nivel_xp);
    const levelUp =
      levelAfter > levelBefore ? { level_anterior: levelBefore, level_novo: levelAfter } : null;
    awardMoedaFromXp(user);
    await user.save({ profileColumns: afkProfileColumns(user, frozenDiaAntes) });
    res.json({
      user: sanitizeUser(user),
      claimed,
      discarded_items,
      bestiario_novos,
      level_up: levelUp,
    });
  } catch (error) {
    console.error('POST /api/meta/afk/claim error:', error);
    res.status(500).json({ error: 'Erro ao coletar recompensas AFK.' });
  }
});

metaRouter.post('/afk/scene', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const mode = req.body?.mode;
    if (mode !== 'village' && mode !== 'exploring') {
      res.status(400).json({ error: "mode precisa ser 'village' ou 'exploring'." });
      return;
    }
    // Vila = tempo pausado (jogador não está explorando de verdade);
    // floresta = tempo volta a correr a partir de agora.
    const frozenDiaAntes = readFrozenDia(user);
    if (mode === 'village') {
      pauseAfk(user);
    } else {
      resumeAfk(user);
    }
    const bestiario_novos = syncAfkRewards(user);
    await user.save({ profileColumns: afkProfileColumns(user, frozenDiaAntes) });
    res.json({ ok: true, ...afkResponsePayload(user, undefined, bestiario_novos) });
  } catch (error) {
    console.error('POST /api/meta/afk/scene error:', error);
    res.status(500).json({ error: 'Erro ao trocar de cena na Exploração.' });
  }
});

/** Fechar a exploração, ocultar a aba ou sair do app sempre retoma a patrulha. */
metaRouter.post('/afk/away', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const combat = ensureCombat(user);
    if (combat.adventure_started) resumeAfk(user);
    await user.save({ profileColumns: [] });
    res.json({ ok: true, ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/away error:', error);
    res.status(500).json({ error: 'Erro ao ativar a patrulha AFK.' });
  }
});

metaRouter.post('/afk/combat/defeat', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const combat = ensureCombat(user);
    const expected = Math.max(0, Number(req.body?.expected_kills_total ?? -1));
    if (expected === combat.kills_total) {
      defeatCurrentEnemy(user, user.afk.pending);
      await user.save({ profileColumns: afkProfileColumns(user) });
    }
    res.json({ ok: true, ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/combat/defeat error:', error);
    res.status(500).json({ error: 'Erro ao registrar a vitória.' });
  }
});

metaRouter.post('/afk/adventure/start', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    startAfkAdventure(user);
    await user.save({ profileColumns: [] });
    res.json({ ok: true, ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/adventure/start error:', error);
    res.status(500).json({ error: 'Erro ao começar a aventura.' });
  }
});

metaRouter.post('/afk/region', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const previousRegion = user.afk.combat?.region_id ?? null;
    const requestedRegion = String(req.body?.region_id ?? '');
    const result = selectAfkRegion(user, requestedRegion);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save({ profileColumns: afkProfileColumns(user) });
    console.info('[afk:region] viagem persistida', {
      from: previousRegion,
      requested: requestedRegion,
      confirmed: user.afk.combat?.region_id ?? null,
    });
    res.json({ ok: true, ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/region error:', error);
    res.status(500).json({ error: 'Erro ao viajar para a região.' });
  }
});

metaRouter.post('/afk/chapter/advance', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const result = advanceAfkChapter(user);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save({ profileColumns: afkProfileColumns(user) });
    res.json({ ...result, ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/chapter/advance error:', error);
    res.status(500).json({ error: 'Erro ao avançar o capítulo.' });
  }
});

metaRouter.post('/afk/skill/unlock', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const result = unlockAfkSkill(user, String(req.body?.node_id ?? ''));
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save({ profileColumns: [] });
    res.json({ ok: true, ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/skill/unlock error:', error);
    res.status(500).json({ error: 'Erro ao desbloquear habilidade.' });
  }
});

metaRouter.post('/afk/skill/reset', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const currency = req.body?.currency === 'gems' ? 'gems' : 'coins';
    const result = resetAfkSkillTree(user, currency);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save({ profileColumns: ['cosmeticos', 'gems'] });
    res.json({ ...result, user: sanitizeUser(user), ...afkResponsePayload(user) });
  } catch (error) {
    console.error('POST /api/meta/afk/skill/reset error:', error);
    res.status(500).json({ error: 'Erro ao resetar a árvore.' });
  }
});

metaRouter.post('/afk/story', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    markAfkStoryFlag(user, String(req.body?.flag ?? 'story'));
    await user.save({ profileColumns: [] });
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/meta/afk/story error:', error);
    res.status(500).json({ error: 'Erro ao salvar diálogo.' });
  }
});

metaRouter.post('/afk/ping', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const frozenDiaAntes = readFrozenDia(user);
    const bestiario_novos = touchAfkPresence(user);
    await user.save({ profileColumns: afkProfileColumns(user, frozenDiaAntes) });
    res.json({ ok: true, ...afkResponsePayload(user, undefined, bestiario_novos) });
  } catch (error) {
    console.error('POST /api/meta/afk/ping error:', error);
    res.status(500).json({ error: 'Erro ao registrar presença.' });
  }
});

metaRouter.get('/inventory', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(readInventarioSummary(user));
  } catch (error) {
    console.error('GET /api/meta/inventory error:', error);
    res.status(500).json({ error: 'Erro ao buscar inventário.' });
  }
});

metaRouter.post('/inventory/bau-patrulha', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const result = usePatrolCache(user);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    awardMoedaFromXp(user);
    // Só as colunas que o consumo do item altera — `preferencias` fica de
    // fora pra não desfazer o que o cliente gravou em paralelo. O estado de
    // AFK continua sendo salvo: os itens simulam kills e mexem em `combat`.
    await user.save({ profileColumns: ITEM_PROFILE_COLUMNS });
    res.json({
      user: sanitizeUser(user),
      claimed: result.claimed,
      inventario: readInventarioSummary(user),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/bau-patrulha error:', error);
    res.status(500).json({ error: 'Erro ao usar Baú da Exploração.' });
  }
});

metaRouter.post('/inventory/route-drink', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    // Não sincronizar antes: syncAfkRewards adicionaria loot offline ao baú.
    const useAll = req.body?.use_all == null ? true : Boolean(req.body.use_all);
    const quantity = useAll
      ? undefined
      : Math.max(1, Math.min(INVENTORY_STACK_CAP, Number(req.body?.quantity) || 1));
    const result = useRouteDrinkInExploration(user, quantity);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    awardMoedaFromXp(user);
    await user.save({ profileColumns: ITEM_PROFILE_COLUMNS });
    res.json({
      user: sanitizeUser(user),
      hours: result.hours,
      quantity_used: result.quantity_used,
      claimed: result.claimed,
      discarded_items: result.discarded_items,
      inventario: readInventarioSummary(user),
      ...afkResponsePayload(user, {
        arma_preferida: user.preferencias?.arma_preferida ?? 'arco',
        route_drink_count: getItemCount(user, ROUTE_DRINK_ITEM_ID),
      }),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/route-drink error:', error);
    res.status(500).json({ error: 'Erro ao usar Route Drink.' });
  }
});

metaRouter.post('/inventory/exp-instant', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const useAll = Boolean(req.body?.use_all);
    const quantity = useAll
      ? undefined
      : Math.max(1, Math.min(INVENTORY_STACK_CAP, Number(req.body?.quantity) || 1));
    const result = useExpInstant(user, quantity);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save({ profileColumns: ITEM_PROFILE_COLUMNS });
    res.json({
      user: sanitizeUser(user),
      xp_ganho: result.xp_ganho,
      quantity_used: result.quantity_used,
      inventario: readInventarioSummary(user),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/exp-instant error:', error);
    res.status(500).json({ error: 'Erro ao usar EXP Instantâneo.' });
  }
});

metaRouter.post('/inventory/doria-bag', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const useAll = Boolean(req.body?.use_all);
    const quantity = useAll
      ? undefined
      : Math.max(1, Math.min(INVENTORY_STACK_CAP, Number(req.body?.quantity) || 1));
    const result = useDoriaBag(user, quantity);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    await user.save({ profileColumns: ITEM_PROFILE_COLUMNS });
    res.json({
      user: sanitizeUser(user),
      abdoria_ganha: result.abdoria_ganha,
      rolls: result.rolls,
      quantity_used: result.quantity_used,
      inventario: readInventarioSummary(user),
    });
  } catch (error) {
    console.error('POST /api/meta/inventory/doria-bag error:', error);
    res.status(500).json({ error: `Erro ao usar ${DORIA_BAG_LABEL}.` });
  }
});

metaRouter.get('/bestiary', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(readBestiaryResponse(user));
  } catch (error) {
    console.error('GET /api/meta/bestiary error:', error);
    res.status(500).json({ error: 'Erro ao carregar bestiário.' });
  }
});

metaRouter.patch('/preferences', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (req.body?.ocultar_aviso_xp_diario !== undefined) {
      user.preferencias.ocultar_aviso_xp_diario = Boolean(req.body.ocultar_aviso_xp_diario);
    }
    if (req.body?.arma_preferida === 'arco' || req.body?.arma_preferida === 'espada') {
      user.preferencias.arma_preferida = req.body.arma_preferida;
    }
    // Caso espelhado do problema acima: esta rota só mexe em `preferencias`,
    // mas um `save()` completo levaria junto `gamificacao`/`cosmeticos` como
    // estavam no início da request — apagando XP/Coins que o ping de AFK
    // (a cada 60s) tivesse creditado nesse meio-tempo.
    await user.saveColumns(['preferencias']);
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PATCH /api/meta/preferences error:', error);
    res.status(500).json({ error: 'Erro ao salvar preferências.' });
  }
});
