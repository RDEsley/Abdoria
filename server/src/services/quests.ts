import {
  QUEST_CATALOG,
  getQuestPeriodKey,
  getQuestPeriodKeyAliases,
  type QuestContext,
  type QuestDefinition,
} from '../../../shared/quests/catalog.js';
import { getSupabase } from '../db.js';
import { User, sanitizeUser } from '../domain/User.js';
import { awardMoedaFromXp, awardQuestXp } from './economy.js';

export interface QuestStatus {
  id: string;
  scope: 'daily' | 'weekly';
  title: string;
  description: string;
  goal: number;
  xp: number;
  progress: number;
  claimed: boolean;
}

function supabaseMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return 'Erro ao acessar missões.';
  return error.message || error.code || 'Erro ao acessar missões.';
}

export async function listQuestsForUser(
  userId: string,
  context: QuestContext,
): Promise<QuestStatus[]> {
  const now = new Date();
  const periodKeys = [
    ...new Set([
      ...getQuestPeriodKeyAliases('daily', now),
      ...getQuestPeriodKeyAliases('weekly', now),
    ]),
  ];

  const { data: claims, error } = await getSupabase()
    .from('quest_claims')
    .select('quest_id, period_key, rewarded_at')
    .eq('user_id', userId)
    .in('period_key', periodKeys);

  if (error) {
    console.error('listQuestsForUser quest_claims:', error);
    throw new Error(supabaseMessage(error));
  }

  const claimedSet = new Set(
    (claims ?? []).map(
      (row: { quest_id: string; period_key: string }) => `${row.quest_id}:${row.period_key}`,
    ),
  );

  return QUEST_CATALOG.map((quest: QuestDefinition) => {
    const aliases = getQuestPeriodKeyAliases(quest.scope, now);
    const claimed = aliases.some((key) => claimedSet.has(`${quest.id}:${key}`));
    return {
      id: quest.id,
      scope: quest.scope,
      title: quest.title,
      description: quest.description,
      goal: quest.goal,
      xp: quest.xp,
      progress: quest.progress(context),
      claimed,
    };
  });
}

interface ClaimSlot {
  already_rewarded: boolean;
  xp_awarded: number;
}

export async function claimQuest(
  userId: string,
  questId: string,
  context: QuestContext,
): Promise<{ user: ReturnType<typeof sanitizeUser>; xp_ganho: number }> {
  const quest = QUEST_CATALOG.find((item) => item.id === questId);
  if (!quest) throw new Error('Missão não encontrada.');

  const progress = quest.progress(context);
  if (progress < quest.goal) throw new Error('Missão ainda não concluída.');

  const now = new Date();
  const periodKey = getQuestPeriodKey(quest.scope, now);
  const aliases = getQuestPeriodKeyAliases(quest.scope, now);

  const existing = await getSupabase()
    .from('quest_claims')
    .select('period_key, rewarded_at, xp_awarded')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .in('period_key', aliases);

  if (existing.error) {
    console.error('claimQuest lookup:', existing.error);
    throw new Error(supabaseMessage(existing.error));
  }

  const rewardedAlias = (existing.data ?? []).find(
    (row: { rewarded_at: string | null }) => row.rewarded_at,
  );
  if (rewardedAlias) {
    throw new Error('Missão já coletada neste período.');
  }

  const pendingAlias = (existing.data ?? []).find(
    (row: { rewarded_at: string | null; period_key: string }) => !row.rewarded_at,
  );
  const slotKey = pendingAlias?.period_key ?? periodKey;

  const { data: slot, error: slotError } = await getSupabase().rpc('claim_quest_slot', {
    p_user_id: userId,
    p_quest_id: questId,
    p_period_key: slotKey,
    p_xp: quest.xp,
  });

  if (slotError) {
    if (slotError.code === '23505') throw new Error('Missão já coletada neste período.');
    if (slotError.code === '23503') {
      throw new Error('Não foi possível coletar a missão. Atualize o app e tente de novo.');
    }
    console.error('claimQuest slot:', slotError);
    throw new Error(supabaseMessage(slotError));
  }

  const parsed = (slot ?? {}) as ClaimSlot;
  if (parsed.already_rewarded) {
    throw new Error('Missão já coletada neste período.');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  const awarded = awardQuestXp(user, quest.xp);
  awardMoedaFromXp(user);
  await user.saveColumns(['gamificacao', 'cosmeticos']);

  const { error: markError } = await getSupabase().rpc('mark_quest_rewarded', {
    p_user_id: userId,
    p_quest_id: questId,
    p_period_key: slotKey,
  });
  if (markError) {
    console.error('claimQuest mark rewarded:', markError);
  }

  return { user: sanitizeUser(user), xp_ganho: awarded };
}
