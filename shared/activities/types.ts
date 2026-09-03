export type ActivityCategory = 'mente' | 'corpo' | 'vida' | 'outro';
export type ActivityMetricKind = 'none' | 'duration' | 'count';
export type ActivityScheduleKind = 'daily' | 'weekdays' | 'once' | 'unscheduled';
export type ActivityPeriod = 'manha' | 'tarde' | 'noite';
export type ActivityLogKind = 'full' | 'minimum';
export type ActivityLogSource = 'quick' | 'routine' | 'migrated';

export interface ActivitySchedule {
  kind: ActivityScheduleKind;
  weekdays?: number[];
  times?: string[];
  period?: ActivityPeriod | null;
  once_at?: string | null;
}

export interface ActivityReminderConfig {
  enabled: boolean;
  offset_min: number;
  follow_up?: boolean;
}

export const DEFAULT_ACTIVITY_SCHEDULE: ActivitySchedule = {
  kind: 'unscheduled',
  weekdays: [],
  times: [],
  period: null,
  once_at: null,
};

export const DEFAULT_ACTIVITY_REMINDER: ActivityReminderConfig = {
  enabled: false,
  offset_min: 0,
  follow_up: false,
};

export interface ActivityRecord {
  id: string;
  user_id: string;
  name: string;
  category: ActivityCategory;
  template_id: string | null;
  icon: string;
  color: string;
  metric_kind: ActivityMetricKind;
  metric_unit: string | null;
  goal_value: number | null;
  minimum_value: number | null;
  schedule: ActivitySchedule;
  reminder: ActivityReminderConfig;
  sort_order: number;
  archived_at: string | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineRecord {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  schedule: ActivitySchedule;
  reminder: ActivityReminderConfig;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  items?: RoutineItemRecord[];
}

export interface RoutineItemRecord {
  routine_id: string;
  activity_id: string;
  position: number;
}

export interface ActivityLogRecord {
  id: string;
  user_id: string;
  activity_id: string | null;
  activity_name_snapshot: string;
  routine_id: string | null;
  day_key: string;
  completed_at: string;
  kind: ActivityLogKind;
  occurrence_key: string | null;
  client_completion_id: string | null;
  metrics: Record<string, unknown>;
  note: string | null;
  duration_min: number | null;
  value: number | null;
  xp_awarded: number;
  leaves_awarded: number;
  source: ActivityLogSource;
  legacy_history_id: string | null;
}

export interface ActivityOccurrence {
  activity_id: string;
  name: string;
  icon: string;
  color: string;
  category: ActivityCategory;
  time: string | null;
  period: ActivityPeriod | null;
  occurrence_key: string;
  status: 'pending' | 'done';
  log_id?: string;
  kind?: ActivityLogKind;
}

export const ACTIVITY_CATEGORIES: ReadonlyArray<{ id: ActivityCategory; label: string }> = [
  { id: 'mente', label: 'Mente' },
  { id: 'corpo', label: 'Corpo' },
  { id: 'vida', label: 'Vida' },
  { id: 'outro', label: 'Outro' },
];

export const ACTIVITY_NAME_MAX = 40;
export const ACTIVITY_NOTE_MAX = 400;
export const ACTIVITIES_MAX = 30;
export const ROUTINES_MAX = 12;
export const ROUTINE_ITEMS_MAX = 12;
