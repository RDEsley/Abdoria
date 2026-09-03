import {
  QUEST_CATALOG,
  getQuestPeriodKey,
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

export async function listQuestsForUser(
  userId: string,
  context: QuestContext,
): Promise<QuestStatus[]> {
  const now = new Date();
  const dailyKey = getQuestPeriodKey('daily', now);
  const weeklyKey = getQuestPeriodKey('weekly', now);

  const { data: claims } = await getSupabase()
    .from('quest_claims')
    .select('quest_id, period_key')
    .eq('user_id', userId)
    .in('period_key', [dailyKey, weeklyKey]);

  const claimedSet = new Set(
    (claims ?? []).map(
      (c: { quest_id: string; period_key: string }) => `${c.quest_id}:${c.period_key}`,
    ),
  );

  return QUEST_CATALOG.map((q: QuestDefinition) => {
    const periodKey = getQuestPeriodKey(q.scope, now);
    return {
      id: q.id,
      scope: q.scope,
      title: q.title,
      description: q.description,
      goal: q.goal,
      xp: q.xp,
      progress: q.progress(context),
      claimed: claimedSet.has(`${q.id}:${periodKey}`),
    };
  });
}

export async function claimQuest(
  userId: string,
  questId: string,
  context: QuestContext,
): Promise<{ user: ReturnType<typeof sanitizeUser>; xp_ganho: number }> {
  const quest = QUEST_CATALOG.find((q) => q.id === questId);
  if (!quest) throw new Error('Missão não encontrada.');

  const progress = quest.progress(context);
  if (progress < quest.goal) throw new Error('Missão ainda não concluída.');

  const now = new Date();
  const periodKey = getQuestPeriodKey(quest.scope, now);

  // Idempotency via PK
  const { error } = await getSupabase().from('quest_claims').insert({
    user_id: userId,
    quest_id: questId,
    period_key: periodKey,
    xp_awarded: quest.xp,
  });

  if (error) {
    if (error.code === '23505') throw new Error('Missão já coletada neste período.');
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  const awarded = awardQuestXp(user, quest.xp);
  awardMoedaFromXp(user);
  await user.saveColumns(['gamificacao', 'cosmeticos']);

  return { user: sanitizeUser(user), xp_ganho: awarded };
}
