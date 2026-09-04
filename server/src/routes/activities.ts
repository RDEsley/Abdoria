import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { Activities, ActivityLogs, Routines } from '../repositories/activities-repository.js';
import { completeActivity } from '../services/activities/complete.js';
import {
  ACTIVITIES_MAX,
  ACTIVITY_NAME_MAX,
  ACTIVITY_NOTE_MAX,
  ROUTINES_MAX,
  normalizeActivityReminder,
  normalizeActivitySchedule,
} from '../../../shared/activities/index.js';

export const activitiesRouter = Router();
activitiesRouter.use(requireAuth);

function readErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error) {
    return Number((error as { status?: number }).status) || 500;
  }
  return 500;
}

activitiesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const list = await Activities.list(req.userId!);
    res.json(list);
  } catch (error) {
    console.error('GET /api/activities error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao listar atividades.' });
  }
});

activitiesRouter.get('/logs', async (req: AuthRequest, res) => {
  try {
    const logs = await ActivityLogs.list(req.userId!, {
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    res.json(logs);
  } catch (error) {
    console.error('GET /api/activities/logs error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao listar registros.' });
  }
});

activitiesRouter.patch('/logs/:id', async (req: AuthRequest, res) => {
  try {
    const patch: Record<string, unknown> = {};
    if (req.body?.metrics && typeof req.body.metrics === 'object') patch.metrics = req.body.metrics;
    if (typeof req.body?.note === 'string') patch.note = req.body.note.slice(0, ACTIVITY_NOTE_MAX);
    if (req.body?.duration_min != null) patch.duration_min = Number(req.body.duration_min);
    if (req.body?.value != null) patch.value = Number(req.body.value);
    const updated = await ActivityLogs.update(req.userId!, String(req.params.id), patch);
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/logs/:id error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao editar registro.' });
  }
});

activitiesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const existing = await Activities.list(req.userId!);
    if (existing.length >= ACTIVITIES_MAX) {
      res.status(400).json({ error: 'Você atingiu o limite de atividades.' });
      return;
    }
    const name = String(req.body?.name ?? '')
      .trim()
      .slice(0, ACTIVITY_NAME_MAX);
    if (!name) {
      res.status(400).json({ error: 'Nome obrigatório.' });
      return;
    }
    const created = await Activities.create({
      user_id: req.userId!,
      name,
      category: req.body?.category,
      template_id: req.body?.template_id ?? null,
      icon: req.body?.icon,
      color: req.body?.color,
      metric_kind: req.body?.metric_kind,
      metric_unit: req.body?.metric_unit ?? null,
      goal_value: req.body?.goal_value ?? null,
      minimum_value: req.body?.minimum_value ?? null,
      schedule: normalizeActivitySchedule(req.body?.schedule),
      reminder: normalizeActivityReminder(req.body?.reminder),
      sort_order: existing.length,
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/activities error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao criar atividade.' });
  }
});

activitiesRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const patch: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string')
      patch.name = req.body.name.trim().slice(0, ACTIVITY_NAME_MAX);
    if (req.body?.category) patch.category = req.body.category;
    if (req.body?.icon) patch.icon = req.body.icon;
    if (req.body?.color) patch.color = req.body.color;
    if (req.body?.metric_kind) patch.metric_kind = req.body.metric_kind;
    if ('metric_unit' in (req.body ?? {})) patch.metric_unit = req.body.metric_unit;
    if ('goal_value' in (req.body ?? {})) patch.goal_value = req.body.goal_value;
    if ('minimum_value' in (req.body ?? {})) patch.minimum_value = req.body.minimum_value;
    if (req.body?.schedule) patch.schedule = normalizeActivitySchedule(req.body.schedule);
    if (req.body?.reminder) patch.reminder = normalizeActivityReminder(req.body.reminder);
    if (typeof req.body?.sort_order === 'number') patch.sort_order = req.body.sort_order;
    const updated = await Activities.update(req.userId!, String(req.params.id), patch);
    res.json(updated);
  } catch (error) {
    console.error('PATCH /api/activities/:id error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao atualizar atividade.' });
  }
});

activitiesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const archived = await Activities.archive(req.userId!, String(req.params.id));
    res.json(archived);
  } catch (error) {
    console.error('DELETE /api/activities/:id error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao arquivar atividade.' });
  }
});

activitiesRouter.post('/:id/complete', async (req: AuthRequest, res) => {
  try {
    const clientCompletionId = String(req.body?.client_completion_id ?? '').trim();
    if (!clientCompletionId) {
      res.status(400).json({ error: 'client_completion_id é obrigatório.' });
      return;
    }
    const result = await completeActivity(req.userId!, {
      activityId: String(req.params.id),
      clientCompletionId,
      kind: req.body?.kind === 'minimum' ? 'minimum' : 'full',
      metrics: req.body?.metrics,
      note:
        typeof req.body?.note === 'string' ? req.body.note.slice(0, ACTIVITY_NOTE_MAX) : undefined,
      occurrenceKey: req.body?.occurrence_key,
      routineId: req.body?.routine_id,
      durationMin: req.body?.duration_min != null ? Number(req.body.duration_min) : undefined,
      value: req.body?.value != null ? Number(req.body.value) : undefined,
    });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    console.error('POST /api/activities/:id/complete error:', error);
    res.status(readErrorStatus(error)).json({
      error: error instanceof Error ? error.message : 'Erro ao concluir atividade.',
    });
  }
});

export const activityLogsRouter = Router();
activityLogsRouter.use(requireAuth);

activityLogsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const logs = await ActivityLogs.list(req.userId!, {
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    res.json(logs);
  } catch (error) {
    console.error('GET /api/activity-logs error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao listar registros.' });
  }
});

activityLogsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const patch: Record<string, unknown> = {};
    if (req.body?.metrics && typeof req.body.metrics === 'object') patch.metrics = req.body.metrics;
    if (typeof req.body?.note === 'string') patch.note = req.body.note.slice(0, ACTIVITY_NOTE_MAX);
    if (req.body?.duration_min != null) patch.duration_min = Number(req.body.duration_min);
    if (req.body?.value != null) patch.value = Number(req.body.value);
    res.json(await ActivityLogs.update(req.userId!, String(req.params.id), patch));
  } catch (error) {
    console.error('PATCH /api/activity-logs/:id error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao editar registro.' });
  }
});

export const routinesRouter = Router();
routinesRouter.use(requireAuth);

routinesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const archived = req.query.archived === '1' || req.query.archived === 'true';
    res.json(await Routines.list(req.userId!, archived));
  } catch (error) {
    console.error('GET /api/routines error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao listar rotinas.' });
  }
});

routinesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const existing = await Routines.list(req.userId!);
    if (existing.length >= ROUTINES_MAX) {
      res.status(400).json({ error: 'Limite de rotinas atingido.' });
      return;
    }
    const name = String(req.body?.name ?? '')
      .trim()
      .slice(0, ACTIVITY_NAME_MAX);
    if (!name) {
      res.status(400).json({ error: 'Nome obrigatório.' });
      return;
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const created = await Routines.create({
      user_id: req.userId!,
      name,
      icon: req.body?.icon,
      color: req.body?.color,
      schedule: normalizeActivitySchedule(req.body?.schedule),
      reminder: normalizeActivityReminder(req.body?.reminder),
      items,
    });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/routines error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao criar rotina.' });
  }
});

routinesRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const patch: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string')
      patch.name = req.body.name.trim().slice(0, ACTIVITY_NAME_MAX);
    if (req.body?.icon) patch.icon = req.body.icon;
    if (req.body?.color) patch.color = req.body.color;
    if (req.body?.schedule) patch.schedule = normalizeActivitySchedule(req.body.schedule);
    if (req.body?.reminder) patch.reminder = normalizeActivityReminder(req.body.reminder);
    if (typeof req.body?.sort_order === 'number') patch.sort_order = req.body.sort_order;
    const items = Array.isArray(req.body?.items) ? req.body.items : undefined;
    res.json(await Routines.update(req.userId!, String(req.params.id), patch, items));
  } catch (error) {
    console.error('PATCH /api/routines/:id error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao atualizar rotina.' });
  }
});

routinesRouter.post('/:id/restore', async (req: AuthRequest, res) => {
  try {
    res.json(await Routines.restore(req.userId!, String(req.params.id)));
  } catch (error) {
    console.error('POST /api/routines/:id/restore error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao restaurar rotina.' });
  }
});

routinesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    res.json(await Routines.archive(req.userId!, String(req.params.id)));
  } catch (error) {
    console.error('DELETE /api/routines/:id error:', error);
    res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Erro ao arquivar rotina.' });
  }
});
