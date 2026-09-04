import {
  findQuestDefinition,
  getQuestPeriodKey,
  getQuestPeriodKeyAliases,
  resolveAssignedQuests,
  selectQuestsForUser,
  type QuestContext,
  type QuestDefinition,
  type QuestScope,
} from '../../../shared/quests/catalog.js';
import { getSupabase } from '../db.js';
import { User, sanitizeUser } from '../domain/User.js';
import { addWeeklyMoedas, addWeeklyXp } from './weekly-stats.js';

export interface QuestStatus {
  id: string;
  scope: QuestScope;
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

interface AssignmentRow {
  period_key: string;
  scope: string;
  quest_ids: string[];
  goal_overrides: Record<string, number> | null;
}

async function loadAssignmentRows(
  userId: string,
  periodKeys: string[],
): Promise<AssignmentRow[]> {
  const { data, error } = await getSupabase()
    .from('quest_assignments')
    .select('period_key, scope, quest_ids, goal_overrides')
    .eq('user_id', userId)
    .in('period_key', periodKeys);
  if (error) {
    console.error('loadAssignmentRows:', error);
    throw new Error(supabaseMessage(error));
  }
  return (data ?? []) as AssignmentRow[];
}

async function insertAssignment(
  userId: string,
  periodKey: string,
  scope: QuestScope,
  quests: QuestDefinition[],
): Promise<AssignmentRow> {
  const goal_overrides: Record<string, number> = {};
  for (const quest of quests) {
    if (
      quest.id === 'monthly_soft_active' ||
      quest.id === 'monthly_workouts_plan' ||
      quest.id === 'weekly_plan_workouts'
    ) {
      goal_overrides[quest.id] = quest.goal;
    }
  }
  const row = {
    user_id: userId,
    period_key: periodKey,
    scope,
    quest_ids: quests.map((q) => q.id),
    goal_overrides,
  };
  const { data, error } = await getSupabase()
    .from('quest_assignments')
    .upsert(row, { onConflict: 'user_id,period_key', ignoreDuplicates: true })
    .select('period_key, scope, quest_ids, goal_overrides')
    .eq('user_id', userId)
    .eq('period_key', periodKey)
    .maybeSingle();

  if (data) return data as AssignmentRow;

  // ignoreDuplicates / corrida: sempre reler o conjunto persistido (imutável no período).
  const existing = await getSupabase()
    .from('quest_assignments')
    .select('period_key, scope, quest_ids, goal_overrides')
    .eq('user_id', userId)
    .eq('period_key', periodKey)
    .maybeSingle();
  if (existing.data) return existing.data as AssignmentRow;
  if (error) {
    console.error('insertAssignment:', error);
    throw new Error(supabaseMessage(error));
  }
  return {
    period_key: periodKey,
    scope,
    quest_ids: row.quest_ids,
    goal_overrides,
  };
}

/**
 * Garante assignments persistentes por período. Mudanças de perfil não
 * substituem o conjunto já criado; na virada do período gera novos.
 */
export async function ensureQuestAssignments(
  userId: string,
  context: QuestContext,
  now = new Date(),
): Promise<QuestDefinition[]> {
  const scopes: QuestScope[] = ['daily', 'weekly', 'monthly'];
  const periodKeys = scopes.map((scope) => getQuestPeriodKey(scope, now));
  const existing = await loadAssignmentRows(userId, periodKeys);
  const byKey = new Map(existing.map((row) => [row.period_key, row]));

  // Seleção inicial só quando falta assignment — usa contexto atual uma vez.
  const freshlySelected = selectQuestsForUser(userId, context, now);
  const selectedByScope = {
    daily: freshlySelected.filter((q) => q.scope === 'daily'),
    weekly: freshlySelected.filter((q) => q.scope === 'weekly'),
    monthly: freshlySelected.filter((q) => q.scope === 'monthly'),
  };

  const assigned: QuestDefinition[] = [];
  for (const scope of scopes) {
    const periodKey = getQuestPeriodKey(scope, now);
    let row = byKey.get(periodKey);
    if (!row) {
      row = await insertAssignment(userId, periodKey, scope, selectedByScope[scope]);
    }
    const overrides =
      row.goal_overrides && typeof row.goal_overrides === 'object'
        ? (row.goal_overrides as Record<string, number>)
        : {};
    assigned.push(...resolveAssignedQuests(row.quest_ids ?? [], context, overrides));
  }
  return assigned;
}

export async function listQuestsForUser(
  userId: string,
  context: QuestContext,
): Promise<QuestStatus[]> {
  const now = new Date();
  const selected = await ensureQuestAssignments(userId, context, now);
  const periodKeys = [
    ...new Set([
      ...getQuestPeriodKeyAliases('daily', now),
      ...getQuestPeriodKeyAliases('weekly', now),
      ...getQuestPeriodKeyAliases('monthly', now),
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
    (claims ?? [])
      .filter((row: { rewarded_at: string | null }) => row.rewarded_at)
      .map(
        (row: { quest_id: string; period_key: string }) => `${row.quest_id}:${row.period_key}`,
      ),
  );

  return selected.map((quest: QuestDefinition) => {
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

interface ClaimRewardResult {
  status: 'awarded' | 'already_rewarded';
  xp_awarded: number;
  moedas_ganhas?: number;
}

export async function claimQuest(
  userId: string,
  questId: string,
  context: QuestContext,
): Promise<{ user: ReturnType<typeof sanitizeUser>; xp_ganho: number }> {
  const assigned = await ensureQuestAssignments(userId, context);
  const quest = findQuestDefinition(questId, assigned);
  if (!quest) throw Object.assign(new Error('Missão não encontrada.'), { status: 404 });

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

  const { data: reward, error: rewardError } = await getSupabase().rpc('claim_quest_reward', {
    p_user_id: userId,
    p_quest_id: questId,
    p_period_key: slotKey,
    p_xp: quest.xp,
  });

  if (rewardError) {
    if (rewardError.code === '23505') throw new Error('Missão já coletada neste período.');
    if (rewardError.code === '23503') {
      throw new Error('Não foi possível coletar a missão. Atualize o app e tente de novo.');
    }
    console.error('claimQuest reward:', rewardError);
    throw new Error(supabaseMessage(rewardError));
  }

  const parsed = (reward ?? {}) as ClaimRewardResult;
  if (parsed.status === 'already_rewarded') {
    throw new Error('Missão já coletada neste período.');
  }

  const awarded = Number(parsed.xp_awarded) || 0;
  const moedas = Number(parsed.moedas_ganhas) || 0;

  const user = await User.findById(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  // Acumuladores semanais (fora do RPC) — só nesta vitória exactly-once.
  if (awarded > 0) addWeeklyXp(user, awarded);
  if (moedas > 0) addWeeklyMoedas(user, moedas);
  if (awarded > 0 || moedas > 0) {
    await user.saveColumns(['gamificacao', 'cosmeticos']);
  }

  return { user: sanitizeUser(user), xp_ganho: awarded };
}
