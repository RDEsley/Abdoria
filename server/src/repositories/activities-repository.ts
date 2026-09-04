import { getSupabase } from '../db.js';
import {
  normalizeActivityReminder,
  normalizeActivitySchedule,
  normalizeRoutineItems,
  routineItemInputToRecord,
  type ActivityLogKind,
  type ActivityLogRecord,
  type ActivityLogSource,
  type ActivityRecord,
  type RoutineItemInput,
  type RoutineItemRecord,
  type RoutineRecord,
} from '../../../shared/activities/index.js';
import { throwIfMissingRelation } from '../utils/schema-errors.js';

function rowToActivity(row: Record<string, unknown>): ActivityRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    category: row.category as ActivityRecord['category'],
    template_id: row.template_id ? String(row.template_id) : null,
    icon: String(row.icon ?? 'star'),
    color: String(row.color ?? 'emerald'),
    metric_kind: (row.metric_kind as ActivityRecord['metric_kind']) ?? 'none',
    metric_unit: row.metric_unit ? String(row.metric_unit) : null,
    goal_value: row.goal_value != null ? Number(row.goal_value) : null,
    minimum_value: row.minimum_value != null ? Number(row.minimum_value) : null,
    schedule: normalizeActivitySchedule(row.schedule),
    reminder: normalizeActivityReminder(row.reminder),
    sort_order: Number(row.sort_order ?? 0),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    legacy_id: row.legacy_id ? String(row.legacy_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToRoutine(
  row: Record<string, unknown>,
  items: RoutineItemRecord[] = [],
): RoutineRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    icon: String(row.icon ?? 'calendar'),
    color: String(row.color ?? 'emerald'),
    schedule: normalizeActivitySchedule(row.schedule),
    reminder: normalizeActivityReminder(row.reminder),
    sort_order: Number(row.sort_order ?? 0),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    items,
  };
}

function rowToLog(row: Record<string, unknown>): ActivityLogRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    activity_id: row.activity_id ? String(row.activity_id) : null,
    activity_name_snapshot: String(row.activity_name_snapshot),
    routine_id: row.routine_id ? String(row.routine_id) : null,
    day_key: String(row.day_key).slice(0, 10),
    completed_at: String(row.completed_at),
    kind: (row.kind as ActivityLogKind) ?? 'full',
    occurrence_key: row.occurrence_key ? String(row.occurrence_key) : null,
    client_completion_id: row.client_completion_id ? String(row.client_completion_id) : null,
    metrics: (row.metrics as Record<string, unknown>) ?? {},
    note: row.note ? String(row.note) : null,
    duration_min: row.duration_min != null ? Number(row.duration_min) : null,
    value: row.value != null ? Number(row.value) : null,
    xp_awarded: Number(row.xp_awarded ?? 0),
    leaves_awarded: Number(row.leaves_awarded ?? 0),
    source: (row.source as ActivityLogSource) ?? 'quick',
    legacy_history_id: row.legacy_history_id ? String(row.legacy_history_id) : null,
  };
}

export const Activities = {
  async list(userId: string, includeArchived = false): Promise<ActivityRecord[]> {
    const sb = getSupabase();
    let query = sb.from('activities').select('*').eq('user_id', userId).order('sort_order');
    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query;
    if (error) throwIfMissingRelation(error, 'activities');
    return (data ?? []).map((row) => rowToActivity(row as Record<string, unknown>));
  },

  async findById(userId: string, id: string): Promise<ActivityRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throwIfMissingRelation(error, 'activities');
    return data ? rowToActivity(data as Record<string, unknown>) : null;
  },

  async findByLegacyId(userId: string, legacyId: string): Promise<ActivityRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .eq('legacy_id', legacyId)
      .maybeSingle();
    if (error) throwIfMissingRelation(error, 'activities');
    return data ? rowToActivity(data as Record<string, unknown>) : null;
  },

  async create(
    input: Partial<ActivityRecord> & { user_id: string; name: string },
  ): Promise<ActivityRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activities')
      .insert({
        user_id: input.user_id,
        name: input.name,
        category: input.category ?? 'outro',
        template_id: input.template_id ?? null,
        icon: input.icon ?? 'star',
        color: input.color ?? 'emerald',
        metric_kind: input.metric_kind ?? 'none',
        metric_unit: input.metric_unit ?? null,
        goal_value: input.goal_value ?? null,
        minimum_value: input.minimum_value ?? null,
        schedule: input.schedule ?? { kind: 'unscheduled', weekdays: [], times: [] },
        reminder: input.reminder ?? { enabled: false, offset_min: 0, follow_up: false },
        sort_order: input.sort_order ?? 0,
        legacy_id: input.legacy_id ?? null,
      })
      .select('*')
      .single();
    if (error) throwIfMissingRelation(error, 'activities');
    return rowToActivity(data as Record<string, unknown>);
  },

  async update(
    userId: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<ActivityRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activities')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throwIfMissingRelation(error, 'activities');
    return rowToActivity(data as Record<string, unknown>);
  },

  async archive(userId: string, id: string): Promise<ActivityRecord> {
    return this.update(userId, id, { archived_at: new Date().toISOString() });
  },

  async restore(userId: string, id: string): Promise<ActivityRecord> {
    return this.update(userId, id, { archived_at: null });
  },
};

export const Routines = {
  async list(userId: string, includeArchived = false): Promise<RoutineRecord[]> {
    const sb = getSupabase();
    let query = sb.from('routines').select('*').eq('user_id', userId);
    if (includeArchived) {
      query = query.not('archived_at', 'is', null).order('archived_at', { ascending: false });
    } else {
      query = query.is('archived_at', null).order('sort_order');
    }
    const { data, error } = await query;
    if (error) throwIfMissingRelation(error, 'routines');
    const routines = (data ?? []).map((row) => rowToRoutine(row as Record<string, unknown>));
    if (routines.length === 0) return [];
    const ids = routines.map((routine) => routine.id);
    const { data: items, error: itemsError } = await sb
      .from('routine_items')
      .select('*')
      .in('routine_id', ids);
    if (itemsError) throwIfMissingRelation(itemsError, 'routine_items');
    const byRoutine = new Map<string, RoutineItemRecord[]>();
    for (const item of items ?? []) {
      const list = byRoutine.get(String(item.routine_id)) ?? [];
      list.push({
        routine_id: String(item.routine_id),
        activity_id: String(item.activity_id),
        position: Number(item.position ?? 0),
        scheduled_time: item.scheduled_time ? String(item.scheduled_time) : null,
        reminder_enabled: item.reminder_enabled === true,
      });
      byRoutine.set(String(item.routine_id), list);
    }
    return routines.map((routine) => ({
      ...routine,
      items: (byRoutine.get(routine.id) ?? []).sort((a, b) => a.position - b.position),
    }));
  },

  async findById(userId: string, id: string): Promise<RoutineRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throwIfMissingRelation(error, 'routines');
    if (!data) return null;
    const routine = rowToRoutine(data as Record<string, unknown>);
    const { data: items, error: itemsError } = await sb
      .from('routine_items')
      .select('*')
      .eq('routine_id', id);
    if (itemsError) throwIfMissingRelation(itemsError, 'routine_items');
    routine.items = (items ?? [])
      .map((item) => ({
        routine_id: String(item.routine_id),
        activity_id: String(item.activity_id),
        position: Number(item.position ?? 0),
        scheduled_time: item.scheduled_time ? String(item.scheduled_time) : null,
        reminder_enabled: item.reminder_enabled === true,
      }))
      .sort((a, b) => a.position - b.position);
    return routine;
  },

  async create(input: {
    user_id: string;
    name: string;
    icon?: string;
    color?: string;
    schedule?: RoutineRecord['schedule'];
    reminder?: RoutineRecord['reminder'];
    /** Aceita `string[]` legado (activity ids) ou itens ricos já normalizados. */
    items?: Array<string | RoutineItemInput>;
  }): Promise<RoutineRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('routines')
      .insert({
        user_id: input.user_id,
        name: input.name,
        icon: input.icon ?? 'calendar',
        color: input.color ?? 'emerald',
        schedule: input.schedule ?? { kind: 'unscheduled', weekdays: [], times: [] },
        reminder: input.reminder ?? { enabled: false, offset_min: 0, follow_up: false },
      })
      .select('*')
      .single();
    if (error) throwIfMissingRelation(error, 'routines');
    const routine = rowToRoutine(data as Record<string, unknown>);
    const normalizedItems = normalizeRoutineItems(input.items ?? []);
    if (normalizedItems.length > 0) {
      const rows = normalizedItems.map((item, position) =>
        routineItemInputToRecord(routine.id, item, position),
      );
      const { error: itemsError } = await sb.from('routine_items').insert(rows);
      if (itemsError) throwIfMissingRelation(itemsError, 'routine_items');
      routine.items = rows;
    }
    return routine;
  },

  async update(
    userId: string,
    id: string,
    patch: Record<string, unknown>,
    items?: Array<string | RoutineItemInput>,
  ): Promise<RoutineRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('routines')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throwIfMissingRelation(error, 'routines');
    if (items) {
      const normalizedItems = normalizeRoutineItems(items);
      await sb.from('routine_items').delete().eq('routine_id', id);
      if (normalizedItems.length > 0) {
        await sb
          .from('routine_items')
          .insert(
            normalizedItems.map((item, position) => routineItemInputToRecord(id, item, position)),
          );
      }
    }
    const routine = rowToRoutine(data as Record<string, unknown>);
    return (await this.findById(userId, routine.id)) ?? routine;
  },

  async archive(userId: string, id: string): Promise<RoutineRecord> {
    return this.update(userId, id, { archived_at: new Date().toISOString() });
  },

  async restore(userId: string, id: string): Promise<RoutineRecord> {
    return this.update(userId, id, { archived_at: null });
  },
};

export const ActivityLogs = {
  async list(userId: string, range?: { from?: string; to?: string }): Promise<ActivityLogRecord[]> {
    const sb = getSupabase();
    let query = sb
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    if (range?.from) query = query.gte('day_key', range.from);
    if (range?.to) query = query.lte('day_key', range.to);
    const { data, error } = await query;
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return (data ?? []).map((row) => rowToLog(row as Record<string, unknown>));
  },

  async findByClientCompletion(
    userId: string,
    clientCompletionId: string,
  ): Promise<ActivityLogRecord | null> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('client_completion_id', clientCompletionId)
      .maybeSingle();
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return data ? rowToLog(data as Record<string, unknown>) : null;
  },

  async hasActivityOnDay(userId: string, activityId: string, dayKey: string): Promise<boolean> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .eq('day_key', dayKey);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return (count ?? 0) > 0;
  },

  /** Algum passo registrado nesta rotina no dia — usado pra silenciar follow-up. */
  async hasRoutineLogOnDay(userId: string, routineId: string, dayKey: string): Promise<boolean> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('routine_id', routineId)
      .eq('day_key', dayKey);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return (count ?? 0) > 0;
  },

  async distinctXpActivitiesOnDay(userId: string, dayKey: string): Promise<number> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .select('activity_id')
      .eq('user_id', userId)
      .eq('day_key', dayKey)
      .gt('xp_awarded', 0);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return new Set((data ?? []).map((row) => String(row.activity_id))).size;
  },

  async hasRoutineBonusOnDay(userId: string, routineId: string, dayKey: string): Promise<boolean> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .select('metrics')
      .eq('user_id', userId)
      .eq('routine_id', routineId)
      .eq('day_key', dayKey);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return (data ?? []).some((row) => {
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      return Number(metrics.routine_bonus_xp ?? 0) > 0;
    });
  },

  async activityIdsDoneOnDay(userId: string, dayKey: string): Promise<Set<string>> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .select('activity_id')
      .eq('user_id', userId)
      .eq('day_key', dayKey)
      .not('activity_id', 'is', null);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return new Set((data ?? []).map((row) => String(row.activity_id)));
  },

  async activityIdsDoneInRoutineOnDay(
    userId: string,
    routineId: string,
    dayKey: string,
  ): Promise<Set<string>> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .select('activity_id')
      .eq('user_id', userId)
      .eq('routine_id', routineId)
      .eq('day_key', dayKey)
      .not('activity_id', 'is', null);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return new Set((data ?? []).map((row) => String(row.activity_id)));
  },

  async count(userId: string): Promise<number> {
    const sb = getSupabase();
    const { count, error } = await sb
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return count ?? 0;
  },

  async insert(input: {
    user_id: string;
    activity_id: string | null;
    activity_name_snapshot: string;
    routine_id?: string | null;
    day_key: string;
    completed_at?: string;
    kind: ActivityLogKind;
    occurrence_key?: string | null;
    client_completion_id?: string | null;
    metrics?: Record<string, unknown>;
    note?: string | null;
    duration_min?: number | null;
    value?: number | null;
    xp_awarded: number;
    leaves_awarded: number;
    source: ActivityLogSource;
    legacy_history_id?: string | null;
  }): Promise<ActivityLogRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .insert({
        user_id: input.user_id,
        activity_id: input.activity_id,
        activity_name_snapshot: input.activity_name_snapshot,
        routine_id: input.routine_id ?? null,
        day_key: input.day_key,
        completed_at: input.completed_at ?? new Date().toISOString(),
        kind: input.kind,
        occurrence_key: input.occurrence_key ?? null,
        client_completion_id: input.client_completion_id ?? null,
        metrics: input.metrics ?? {},
        note: input.note ?? null,
        duration_min: input.duration_min ?? null,
        value: input.value ?? null,
        xp_awarded: input.xp_awarded,
        leaves_awarded: input.leaves_awarded,
        source: input.source,
        legacy_history_id: input.legacy_history_id ?? null,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505' && input.client_completion_id) {
        const existing = await this.findByClientCompletion(
          input.user_id,
          input.client_completion_id,
        );
        if (existing) return existing;
      }
      throwIfMissingRelation(error, 'activity_logs');
    }
    return rowToLog(data as Record<string, unknown>);
  },

  async update(
    userId: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<ActivityLogRecord> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('activity_logs')
      .update(patch)
      .eq('user_id', userId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throwIfMissingRelation(error, 'activity_logs');
    return rowToLog(data as Record<string, unknown>);
  },
};
