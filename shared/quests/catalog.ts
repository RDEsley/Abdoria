/**
 * Catálogo de missões — templates + seleção determinística por usuário/período.
 *
 * Build ≠ random: mesmas missões durante o dia / semana / mês (America/Sao_Paulo).
 * Progresso é puro sobre QuestContext. XP fica fora do teto diário (awardQuestXp).
 */

import { getTodaySaoPaulo, getWeekStartSaoPaulo } from '../utils/timezone.js';

export type QuestScope = 'daily' | 'weekly' | 'monthly';
export type QuestDomain = 'training' | 'activity' | 'nutrition' | 'general';

export interface QuestDefinition {
  id: string;
  scope: QuestScope;
  title: string;
  description: string;
  goal: number;
  xp: number;
  progress: (ctx: QuestContext) => number;
  /** Se false, o template não entra no pool deste usuário neste período. */
  eligible?: (ctx: QuestContext) => boolean;
  /** Domínio para variedade na seleção diária (opcional). */
  domain?: QuestDomain;
}

export interface QuestContext {
  activitiesCompletedToday: number;
  activitiesCompletedThisWeek: number;
  activitiesCompletedThisMonth: number;
  routinesCompletedToday: number;
  routinesCompletedThisWeek: number;
  routinesCompletedThisMonth: number;
  /** Atividades com horário planejado para hoje que foram concluídas. */
  scheduledActivityCompletedToday: number;
  /** Rotinas programadas para hoje que foram concluídas. */
  scheduledRoutineCompletedToday: number;
  morningComplete: boolean;
  afternoonComplete: boolean;
  eveningComplete: boolean;
  trainedToday: boolean;
  trainingDayToday: boolean;
  weeklyTrainingDays: number;
  activeDaysThisWeek: number;
  activeDaysThisMonth: number;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  hasRoutines: boolean;
  hasRoutineScheduledToday: boolean;
  hasActivities: boolean;
  hasScheduledActivityToday: boolean;
  categoriesToday: ReadonlySet<string>;
  categoriesUsed: ReadonlySet<string>;
  menteCompletedToday: number;
  corpoCompletedToday: number;
  vidaCompletedToday: number;
  distinctCategoriesThisWeek: number;
  daysRemainingInMonth: number;
  dayOfMonth: number;
  streakAtual: number;
  /** Setup de alimentação concluído (nutrition_profiles.setup_completed_at). */
  nutritionSetup: boolean;
  /** Refeições distintas (meal_type) com log hoje. */
  mealsLoggedToday: number;
  /** Dias distintos com food_log nesta semana civil SP. */
  nutritionDaysThisWeek: number;
  /** Dias distintos com food_log neste mês civil SP. */
  nutritionDaysThisMonth: number;
  /** Eventos de receita logados nesta semana (note recipe:<id>). */
  recipesLoggedThisWeek: number;
}

export const QUEST_DAILY_XP_BUDGET = 30;
export const QUEST_WEEKLY_XP_BUDGET = 60;
export const QUEST_MONTHLY_XP_BUDGET = 80;

export const QUEST_DAILY_COUNT = 3;
export const QUEST_WEEKLY_COUNT = 2;
export const QUEST_MONTHLY_COUNT = 1;

/** Pool completo — a seleção escolhe um subconjunto elegível e estável. */
export const QUEST_TEMPLATE_POOL: readonly QuestDefinition[] = [
  // ——— Daily ———
  {
    id: 'daily_1_activity',
    scope: 'daily',
    domain: 'activity',
    title: 'Um passo',
    description: 'Conclua 1 atividade hoje',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.hasActivities,
    progress: (ctx) => Math.min(ctx.activitiesCompletedToday, 1),
  },
  {
    id: 'daily_2_activities',
    scope: 'daily',
    domain: 'activity',
    title: 'Dois passos',
    description: 'Conclua 2 atividades hoje',
    goal: 2,
    xp: 10,
    eligible: (ctx) => ctx.hasActivities,
    progress: (ctx) => Math.min(ctx.activitiesCompletedToday, 2),
  },
  {
    id: 'daily_3_activities',
    scope: 'daily',
    domain: 'activity',
    title: 'Três passos',
    description: 'Conclua 3 atividades hoje',
    goal: 3,
    xp: 10,
    eligible: (ctx) => ctx.hasActivities,
    progress: (ctx) => Math.min(ctx.activitiesCompletedToday, 3),
  },
  {
    id: 'daily_scheduled_activity',
    scope: 'daily',
    domain: 'activity',
    title: 'No horário',
    description: 'Conclua uma atividade programada para hoje',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.hasScheduledActivityToday,
    progress: (ctx) => Math.min(ctx.scheduledActivityCompletedToday, 1),
  },
  {
    id: 'daily_routine',
    scope: 'daily',
    domain: 'activity',
    title: 'Rotina completa',
    description: 'Conclua uma rotina hoje',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.hasRoutines,
    progress: (ctx) => Math.min(ctx.routinesCompletedToday, 1),
  },
  {
    id: 'daily_routine_scheduled',
    scope: 'daily',
    domain: 'activity',
    title: 'Rotina do dia',
    description: 'Conclua uma rotina programada para hoje',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.hasRoutineScheduledToday,
    progress: (ctx) => Math.min(ctx.scheduledRoutineCompletedToday, 1),
  },
  {
    id: 'daily_train',
    scope: 'daily',
    domain: 'training',
    title: 'Treino do dia',
    description: 'Faça um treino hoje',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.trainingDayToday || ctx.weeklyTrainingDays > 0,
    progress: (ctx) => (ctx.trainedToday ? 1 : 0),
  },
  {
    id: 'daily_mente',
    scope: 'daily',
    domain: 'activity',
    title: 'Mente em foco',
    description: 'Conclua uma atividade de Mente',
    goal: 1,
    xp: 10,
    eligible: (ctx) => Boolean(ctx.categoriesUsed?.has('mente')),
    progress: (ctx) => Math.min(ctx.menteCompletedToday, 1),
  },
  {
    id: 'daily_corpo',
    scope: 'daily',
    domain: 'activity',
    title: 'Corpo em movimento',
    description: 'Conclua uma atividade de Corpo',
    goal: 1,
    xp: 10,
    eligible: (ctx) => Boolean(ctx.categoriesUsed?.has('corpo')),
    progress: (ctx) => Math.min(ctx.corpoCompletedToday, 1),
  },
  {
    id: 'daily_vida',
    scope: 'daily',
    domain: 'activity',
    title: 'Vida em ordem',
    description: 'Conclua uma atividade de Vida',
    goal: 1,
    xp: 10,
    eligible: (ctx) => Boolean(ctx.categoriesUsed?.has('vida')),
    progress: (ctx) => Math.min(ctx.vidaCompletedToday, 1),
  },
  {
    id: 'daily_morning_block',
    scope: 'daily',
    domain: 'activity',
    title: 'Bloco da manhã',
    description: 'Complete o bloco da manhã',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.hasScheduledActivityToday,
    progress: (ctx) => (ctx.morningComplete ? 1 : 0),
  },
  {
    id: 'daily_any_block',
    scope: 'daily',
    domain: 'activity',
    title: 'Um bloco do dia',
    description: 'Complete manhã, tarde ou noite',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.hasScheduledActivityToday,
    progress: (ctx) =>
      ctx.morningComplete || ctx.afternoonComplete || ctx.eveningComplete ? 1 : 0,
  },
  {
    id: 'daily_nutrition_meal',
    scope: 'daily',
    domain: 'nutrition',
    title: 'Refeição do dia',
    description: 'Registre uma refeição hoje',
    goal: 1,
    xp: 10,
    eligible: (ctx) => ctx.nutritionSetup,
    progress: (ctx) => Math.min(ctx.mealsLoggedToday, 1),
  },

  // ——— Weekly ———
  {
    id: 'weekly_3_active_days',
    scope: 'weekly',
    domain: 'general',
    title: 'Três dias vivos',
    description: 'Tenha 3 dias ativos esta semana',
    goal: 3,
    xp: 30,
    progress: (ctx) => Math.min(ctx.activeDaysThisWeek, 3),
  },
  {
    id: 'weekly_5_active_days',
    scope: 'weekly',
    domain: 'general',
    title: 'Semana forte',
    description: 'Tenha 5 dias ativos esta semana',
    goal: 5,
    xp: 30,
    progress: (ctx) => Math.min(ctx.activeDaysThisWeek, 5),
  },
  {
    id: 'weekly_2_workouts',
    scope: 'weekly',
    domain: 'training',
    title: 'Dupla de treinos',
    description: 'Treine 2 vezes esta semana',
    goal: 2,
    xp: 30,
    eligible: (ctx) => ctx.weeklyTrainingDays >= 2,
    progress: (ctx) => Math.min(ctx.workoutsThisWeek, 2),
  },
  {
    id: 'weekly_3_workouts',
    scope: 'weekly',
    domain: 'training',
    title: 'Trio de treinos',
    description: 'Treine 3 vezes esta semana',
    goal: 3,
    xp: 30,
    eligible: (ctx) => ctx.weeklyTrainingDays >= 3,
    progress: (ctx) => Math.min(ctx.workoutsThisWeek, 3),
  },
  {
    id: 'weekly_plan_workouts',
    scope: 'weekly',
    domain: 'training',
    title: 'Plano da semana',
    description: 'Cumpra os treinos do seu plano nesta semana',
    goal: 1,
    xp: 30,
    eligible: (ctx) => ctx.weeklyTrainingDays >= 1,
    progress: (ctx) =>
      Math.min(ctx.workoutsThisWeek, Math.max(1, ctx.weeklyTrainingDays)) >=
      Math.max(1, ctx.weeklyTrainingDays)
        ? Math.max(1, ctx.weeklyTrainingDays)
        : ctx.workoutsThisWeek,
  },
  {
    id: 'weekly_5_activities',
    scope: 'weekly',
    domain: 'activity',
    title: 'Cinco ações',
    description: 'Conclua 5 atividades esta semana',
    goal: 5,
    xp: 30,
    eligible: (ctx) => ctx.hasActivities,
    progress: (ctx) => Math.min(ctx.activitiesCompletedThisWeek, 5),
  },
  {
    id: 'weekly_2_routines',
    scope: 'weekly',
    domain: 'activity',
    title: 'Rotinas em série',
    description: 'Conclua 2 rotinas esta semana',
    goal: 2,
    xp: 30,
    eligible: (ctx) => ctx.hasRoutines,
    progress: (ctx) => Math.min(ctx.routinesCompletedThisWeek, 2),
  },
  {
    id: 'weekly_categories',
    scope: 'weekly',
    domain: 'activity',
    title: 'Variedade',
    description: 'Atue em 2 categorias diferentes esta semana',
    goal: 2,
    xp: 30,
    eligible: (ctx) => (ctx.categoriesUsed?.size ?? 0) >= 2,
    progress: (ctx) => Math.min(ctx.distinctCategoriesThisWeek, 2),
  },
  {
    id: 'weekly_nutrition_3_days',
    scope: 'weekly',
    domain: 'nutrition',
    title: 'Alimentação da semana',
    description: 'Cuide da alimentação em 3 dias desta semana',
    goal: 3,
    xp: 30,
    eligible: (ctx) => ctx.nutritionSetup,
    progress: (ctx) => Math.min(ctx.nutritionDaysThisWeek, 3),
  },
  {
    id: 'weekly_nutrition_recipe',
    scope: 'weekly',
    domain: 'nutrition',
    title: 'Receita da semana',
    description: 'Experimente uma receita do Evolyn',
    goal: 1,
    xp: 30,
    eligible: (ctx) => ctx.nutritionSetup,
    progress: (ctx) => Math.min(ctx.recipesLoggedThisWeek, 1),
  },

  // ——— Monthly ———
  {
    id: 'monthly_20_active_days',
    scope: 'monthly',
    domain: 'general',
    title: 'Mês com raízes',
    description: 'Tenha 20 dias ativos neste mês',
    goal: 20,
    xp: 80,
    eligible: (ctx) => ctx.daysRemainingInMonth + ctx.activeDaysThisMonth >= 20,
    progress: (ctx) => Math.min(ctx.activeDaysThisMonth, 20),
  },
  {
    id: 'monthly_15_active_days',
    scope: 'monthly',
    domain: 'general',
    title: 'Presença mensal',
    description: 'Tenha 15 dias ativos neste mês',
    goal: 15,
    xp: 80,
    eligible: (ctx) => ctx.daysRemainingInMonth + ctx.activeDaysThisMonth >= 15,
    progress: (ctx) => Math.min(ctx.activeDaysThisMonth, 15),
  },
  {
    id: 'monthly_10_active_days',
    scope: 'monthly',
    domain: 'general',
    title: 'Começo de mês',
    description: 'Tenha 10 dias ativos neste mês',
    goal: 10,
    xp: 80,
    eligible: (ctx) => ctx.daysRemainingInMonth + ctx.activeDaysThisMonth >= 10,
    progress: (ctx) => Math.min(ctx.activeDaysThisMonth, 10),
  },
  {
    id: 'monthly_12_activities',
    scope: 'monthly',
    domain: 'activity',
    title: 'Hábitos do mês',
    description: 'Conclua 12 atividades neste mês',
    goal: 12,
    xp: 80,
    eligible: (ctx) => ctx.hasActivities,
    progress: (ctx) => Math.min(ctx.activitiesCompletedThisMonth, 12),
  },
  {
    id: 'monthly_8_routines',
    scope: 'monthly',
    domain: 'activity',
    title: 'Rotinas do mês',
    description: 'Conclua 8 rotinas neste mês',
    goal: 8,
    xp: 80,
    eligible: (ctx) => ctx.hasRoutines,
    progress: (ctx) => Math.min(ctx.routinesCompletedThisMonth, 8),
  },
  {
    id: 'monthly_workouts_plan',
    scope: 'monthly',
    domain: 'training',
    title: 'Constância no treino',
    description: 'Complete os treinos do mês conforme seu plano',
    goal: 1,
    xp: 80,
    eligible: (ctx) => ctx.weeklyTrainingDays >= 1 && ctx.daysRemainingInMonth + ctx.dayOfMonth >= 14,
    progress: (ctx) => {
      const weeksLeft = Math.max(1, Math.ceil(ctx.daysRemainingInMonth / 7));
      const target = Math.min(16, Math.max(4, ctx.weeklyTrainingDays * Math.min(4, weeksLeft)));
      return Math.min(ctx.workoutsThisMonth, target);
    },
  },
  {
    id: 'monthly_nutrition_10_days',
    scope: 'monthly',
    domain: 'nutrition',
    title: 'Mês na alimentação',
    description: 'Registre alimentação em 10 dias neste mês',
    goal: 10,
    xp: 80,
    eligible: (ctx) =>
      ctx.nutritionSetup && ctx.daysRemainingInMonth + ctx.nutritionDaysThisMonth >= 10,
    progress: (ctx) => Math.min(ctx.nutritionDaysThisMonth, 10),
  },
] as const;

/** @deprecated use QUEST_TEMPLATE_POOL — mantido para testes de orçamento por template. */
export const QUEST_CATALOG = QUEST_TEMPLATE_POOL;

function fnv1a(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stablePick<T extends { id: string }>(
  items: readonly T[],
  seed: string,
  count: number,
): T[] {
  if (items.length === 0 || count <= 0) return [];
  const ranked = items
    .map((item) => ({ item, rank: fnv1a(`${seed}:${item.id}`) }))
    .sort((a, b) => a.rank - b.rank || a.item.id.localeCompare(b.item.id));
  return ranked.slice(0, Math.min(count, ranked.length)).map((entry) => entry.item);
}

/**
 * Seleção diária: ranking estável + preferência por misturar domínios
 * (training / activity / nutrition) quando há opções elegíveis — sem forçar
 * domínio ausente no pool.
 */
function stablePickDaily(
  items: readonly QuestDefinition[],
  seed: string,
  count: number,
): QuestDefinition[] {
  if (items.length === 0 || count <= 0) return [];
  const ranked = items
    .map((item) => ({ item, rank: fnv1a(`${seed}:${item.id}`) }))
    .sort((a, b) => a.rank - b.rank || a.item.id.localeCompare(b.item.id));

  const picked: QuestDefinition[] = [];
  const pickedIds = new Set<string>();
  const domains = new Set<QuestDomain>();

  for (const { item } of ranked) {
    if (picked.length >= count) break;
    const domain = item.domain ?? 'general';
    if (domains.has(domain)) continue;
    picked.push(item);
    pickedIds.add(item.id);
    domains.add(domain);
  }

  for (const { item } of ranked) {
    if (picked.length >= count) break;
    if (pickedIds.has(item.id)) continue;
    picked.push(item);
    pickedIds.add(item.id);
  }

  return picked;
}

function resolveMonthlyWorkoutGoal(ctx: QuestContext): number {
  // Congela meta alcançável no momento da materialização (dias restantes do mês).
  const remainingCapacity = Math.max(0, ctx.daysRemainingInMonth) + ctx.workoutsThisMonth;
  const weeksApprox = Math.max(1, Math.ceil((ctx.dayOfMonth + ctx.daysRemainingInMonth) / 7));
  const planned = Math.min(16, Math.max(4, ctx.weeklyTrainingDays * Math.min(4, weeksApprox)));
  return Math.max(1, Math.min(planned, Math.max(ctx.workoutsThisMonth, remainingCapacity)));
}

/** Materializa goal/description dinâmicos (ex.: treinos do plano). */
export function materializeQuest(template: QuestDefinition, ctx: QuestContext): QuestDefinition {
  if (template.id === 'weekly_plan_workouts') {
    const goal = Math.max(1, ctx.weeklyTrainingDays);
    return {
      ...template,
      goal,
      description: `Treine ${goal} ${goal === 1 ? 'vez' : 'vezes'} esta semana`,
      progress: (c) => Math.min(c.workoutsThisWeek, goal),
    };
  }
  if (template.id === 'monthly_workouts_plan') {
    const goal = resolveMonthlyWorkoutGoal(ctx);
    return {
      ...template,
      goal,
      description: `Complete ${goal} treinos neste mês`,
      progress: (c) => Math.min(c.workoutsThisMonth, goal),
    };
  }
  return template;
}

function fallbackDaily(): QuestDefinition {
  return {
    id: 'daily_1_activity',
    scope: 'daily',
    title: 'Um passo',
    description: 'Conclua 1 atividade hoje',
    goal: 1,
    xp: 10,
    progress: (ctx) => Math.min(ctx.activitiesCompletedToday, 1),
  };
}

function fallbackWeekly(): QuestDefinition {
  return {
    id: 'weekly_3_active_days',
    scope: 'weekly',
    title: 'Três dias vivos',
    description: 'Tenha 3 dias ativos esta semana',
    goal: 3,
    xp: 30,
    progress: (ctx) => Math.min(ctx.activeDaysThisWeek, 3),
  };
}

function fallbackMonthly(ctx: QuestContext): QuestDefinition {
  const reachable = Math.min(
    10,
    Math.max(3, ctx.activeDaysThisMonth + ctx.daysRemainingInMonth),
  );
  return {
    id: 'monthly_soft_active',
    scope: 'monthly',
    title: 'Presença possível',
    description: `Tenha ${reachable} dias ativos neste mês`,
    goal: reachable,
    xp: 80,
    progress: (c) => Math.min(c.activeDaysThisMonth, reachable),
  };
}

/**
 * Escolhe missões estáveis para o usuário neste instante (período SP).
 * Sempre retorna 3 diárias + 2 semanais + 1 mensal quando há fallbacks.
 * Preferir `ensureQuestAssignments` no servidor para persistir o conjunto.
 */
export function selectQuestsForUser(
  userId: string,
  ctx: QuestContext,
  now = new Date(),
): QuestDefinition[] {
  const dailyKey = getQuestPeriodKey('daily', now);
  const weeklyKey = getQuestPeriodKey('weekly', now);
  const monthlyKey = getQuestPeriodKey('monthly', now);

  const pickScope = (
    scope: QuestScope,
    count: number,
    periodKey: string,
    fallback: () => QuestDefinition[],
  ) => {
    const eligible = QUEST_TEMPLATE_POOL.filter(
      (q) => q.scope === scope && (q.eligible?.(ctx) ?? true),
    );
    const seed = `${userId}:${periodKey}`;
    const picked =
      scope === 'daily'
        ? stablePickDaily(eligible, seed, count)
        : stablePick(eligible, seed, count);
    if (picked.length >= count) return picked.map((q) => materializeQuest(q, ctx));
    const extras = fallback().filter((f) => !picked.some((p) => p.id === f.id));
    return [...picked, ...extras].slice(0, count).map((q) => materializeQuest(q, ctx));
  };

  const daily = pickScope('daily', QUEST_DAILY_COUNT, dailyKey, () => [
    fallbackDaily(),
    {
      id: 'daily_any_action',
      scope: 'daily',
      title: 'Dia ativo',
      description: 'Faça qualquer ação válida hoje',
      goal: 1,
      xp: 10,
      progress: (c) =>
        c.activitiesCompletedToday > 0 || c.trainedToday || c.routinesCompletedToday > 0 ? 1 : 0,
    },
    {
      id: 'daily_open_evolyn',
      scope: 'daily',
      title: 'Volte amanhã',
      description: 'Mantenha o ritmo — qualquer passo conta',
      goal: 1,
      xp: 10,
      progress: (c) =>
        c.activitiesCompletedToday > 0 || c.trainedToday || c.routinesCompletedToday > 0 ? 1 : 0,
    },
  ]);

  const weekly = pickScope('weekly', QUEST_WEEKLY_COUNT, weeklyKey, () => [
    fallbackWeekly(),
    {
      id: 'weekly_soft_active',
      scope: 'weekly',
      title: 'Semana leve',
      description: 'Tenha 2 dias ativos esta semana',
      goal: 2,
      xp: 30,
      progress: (c) => Math.min(c.activeDaysThisWeek, 2),
    },
  ]);

  const monthlyEligible = QUEST_TEMPLATE_POOL.filter(
    (q) => q.scope === 'monthly' && (q.eligible?.(ctx) ?? true),
  );
  let monthly = stablePick(monthlyEligible, `${userId}:${monthlyKey}`, QUEST_MONTHLY_COUNT).map(
    (q) => materializeQuest(q, ctx),
  );
  if (monthly.length === 0) monthly = [fallbackMonthly(ctx)];

  return [...daily, ...weekly, ...monthly];
}

/** Resolve defs a partir de ids persistidos (sem fallback para o pool inteiro). */
export function resolveAssignedQuests(
  questIds: readonly string[],
  ctx: QuestContext,
  goalOverrides: Record<string, number> = {},
): QuestDefinition[] {
  const byId = new Map<string, QuestDefinition>();
  for (const template of QUEST_TEMPLATE_POOL) byId.set(template.id, template);
  // Fallbacks dinâmicos usados na seleção
  byId.set('daily_any_action', {
    id: 'daily_any_action',
    scope: 'daily',
    title: 'Dia ativo',
    description: 'Faça qualquer ação válida hoje',
    goal: 1,
    xp: 10,
    progress: (c) =>
      c.activitiesCompletedToday > 0 || c.trainedToday || c.routinesCompletedToday > 0 ? 1 : 0,
  });
  byId.set('daily_open_evolyn', {
    id: 'daily_open_evolyn',
    scope: 'daily',
    title: 'Volte amanhã',
    description: 'Mantenha o ritmo — qualquer passo conta',
    goal: 1,
    xp: 10,
    progress: (c) =>
      c.activitiesCompletedToday > 0 || c.trainedToday || c.routinesCompletedToday > 0 ? 1 : 0,
  });
  byId.set('weekly_soft_active', {
    id: 'weekly_soft_active',
    scope: 'weekly',
    title: 'Semana leve',
    description: 'Tenha 2 dias ativos esta semana',
    goal: 2,
    xp: 30,
    progress: (c) => Math.min(c.activeDaysThisWeek, 2),
  });

  const resolved: QuestDefinition[] = [];
  for (const id of questIds) {
    const template = byId.get(id) ?? (id === 'monthly_soft_active' ? fallbackMonthly(ctx) : undefined);
    if (!template) continue;
    let quest = materializeQuest(template, ctx);
    const override = goalOverrides[id];
    if (typeof override === 'number' && override > 0 && override !== quest.goal) {
      const goal = override;
      quest = {
        ...quest,
        goal,
        description:
          quest.id === 'monthly_soft_active'
            ? `Tenha ${goal} dias ativos neste mês`
            : quest.id === 'monthly_workouts_plan'
              ? `Complete ${goal} treinos neste mês`
              : quest.id === 'weekly_plan_workouts'
                ? `Treine ${goal} ${goal === 1 ? 'vez' : 'vezes'} esta semana`
                : quest.description,
        progress: (c) => {
          if (quest.id === 'monthly_soft_active' || quest.id.includes('active_days')) {
            return Math.min(c.activeDaysThisMonth, goal);
          }
          if (quest.id === 'monthly_workouts_plan') return Math.min(c.workoutsThisMonth, goal);
          if (quest.id === 'weekly_plan_workouts') return Math.min(c.workoutsThisWeek, goal);
          return Math.min(quest.progress(c), goal);
        },
      };
    }
    resolved.push(quest);
  }
  return resolved;
}

/**
 * Só aceita missão do conjunto atribuído. Sem fallback para o pool completo.
 */
export function findQuestDefinition(
  questId: string,
  assigned: readonly QuestDefinition[],
): QuestDefinition | undefined {
  return assigned.find((q) => q.id === questId);
}

/** Chave estável do período em America/Sao_Paulo. */
export function getQuestPeriodKey(scope: QuestScope, now = new Date()): string {
  if (scope === 'daily') return getTodaySaoPaulo(now);
  if (scope === 'weekly') return `W${getWeekStartSaoPaulo(now)}`;
  const day = getTodaySaoPaulo(now);
  return `M${day.slice(0, 7)}`;
}

export function getQuestPeriodKeyAliases(scope: QuestScope, now = new Date()): string[] {
  const canonical = getQuestPeriodKey(scope, now);
  if (scope === 'monthly') return [canonical];
  const utcDay = now.toISOString().slice(0, 10);
  const utcWeekDate = new Date(now);
  const utcWeekday = utcWeekDate.getUTCDay();
  const utcDiff = utcWeekDate.getUTCDate() - utcWeekday + (utcWeekday === 0 ? -6 : 1);
  utcWeekDate.setUTCDate(utcDiff);
  const legacy =
    scope === 'daily' ? utcDay : `W${utcWeekDate.toISOString().slice(0, 10)}`;
  return legacy === canonical ? [canonical] : [canonical, legacy];
}
