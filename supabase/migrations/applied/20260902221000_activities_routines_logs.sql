-- Atividades 2.0: entidades próprias (activities, routines, logs).
-- Linhas antigas de workout_history com atividade jsonb NÃO são apagadas.

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text not null check (category in ('mente', 'corpo', 'vida', 'outro')),
  template_id text,
  icon text not null default 'star',
  color text not null default 'emerald',
  metric_kind text not null default 'none' check (metric_kind in ('none', 'duration', 'count')),
  metric_unit text,
  goal_value numeric,
  minimum_value numeric,
  schedule jsonb not null default '{"kind":"unscheduled","weekdays":[],"times":[],"period":null,"once_at":null}'::jsonb,
  reminder jsonb not null default '{"enabled":false,"offset_min":0,"follow_up":false}'::jsonb,
  sort_order integer not null default 0,
  archived_at timestamptz,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activities_user_archived
  on public.activities (user_id, archived_at);
create unique index if not exists idx_activities_user_legacy
  on public.activities (user_id, legacy_id)
  where legacy_id is not null;

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  icon text not null default 'calendar',
  color text not null default 'emerald',
  schedule jsonb not null default '{"kind":"unscheduled","weekdays":[],"times":[],"period":null,"once_at":null}'::jsonb,
  reminder jsonb not null default '{"enabled":false,"offset_min":0,"follow_up":false}'::jsonb,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_routines_user_archived
  on public.routines (user_id, archived_at);

create table if not exists public.routine_items (
  routine_id uuid not null references public.routines (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete cascade,
  position integer not null default 0,
  primary key (routine_id, activity_id)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  activity_name_snapshot text not null,
  routine_id uuid references public.routines (id) on delete set null,
  day_key date not null,
  completed_at timestamptz not null default now(),
  kind text not null default 'full' check (kind in ('full', 'minimum')),
  occurrence_key text,
  client_completion_id uuid,
  metrics jsonb not null default '{}'::jsonb,
  note text,
  duration_min integer,
  value numeric,
  xp_awarded integer not null default 0,
  leaves_awarded integer not null default 0,
  source text not null default 'quick' check (source in ('quick', 'routine', 'migrated')),
  legacy_history_id uuid
);

create unique index if not exists idx_activity_logs_client_completion
  on public.activity_logs (user_id, client_completion_id)
  where client_completion_id is not null;
create index if not exists idx_activity_logs_user_day
  on public.activity_logs (user_id, day_key desc);
create index if not exists idx_activity_logs_user_activity_day
  on public.activity_logs (user_id, activity_id, day_key);

drop trigger if exists activities_updated_at on public.activities;
create trigger activities_updated_at before update on public.activities
  for each row execute function public.update_updated_at();

drop trigger if exists routines_updated_at on public.routines;
create trigger routines_updated_at before update on public.routines
  for each row execute function public.update_updated_at();

alter table public.activities enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.activity_logs enable row level security;

revoke all on table public.activities from anon, authenticated, public;
revoke all on table public.routines from anon, authenticated, public;
revoke all on table public.routine_items from anon, authenticated, public;
revoke all on table public.activity_logs from anon, authenticated, public;

-- Backfill de activities a partir de preferencias.atividades
insert into public.activities (
  user_id, name, category, template_id, icon, color, metric_kind, metric_unit,
  goal_value, schedule, reminder, sort_order, legacy_id
)
select
  p.id,
  coalesce(nullif(item->>'nome', ''), 'Atividade'),
  case item->>'tipo'
    when 'leitura' then 'mente'
    when 'estudo' then 'mente'
    when 'escrita' then 'mente'
    when 'meditacao' then 'mente'
    when 'corrida' then 'corpo'
    when 'pedalada' then 'corpo'
    when 'caminhada' then 'corpo'
    when 'natacao' then 'corpo'
    when 'alongamento' then 'corpo'
    when 'yoga' then 'corpo'
    when 'esporte' then 'corpo'
    when 'organizacao' then 'vida'
    else 'outro'
  end,
  case item->>'tipo'
    when 'leitura' then 'tpl_leitura'
    when 'estudo' then 'tpl_estudo'
    when 'escrita' then 'tpl_escrita'
    when 'meditacao' then 'tpl_meditacao'
    when 'corrida' then 'tpl_corrida'
    when 'caminhada' then 'tpl_caminhada'
    when 'alongamento' then 'tpl_alongamento'
    when 'yoga' then 'tpl_yoga'
    when 'organizacao' then 'tpl_organizar'
    else null
  end,
  coalesce(nullif(item->>'icon', ''), 'star'),
  'emerald',
  case
    when item->>'meta_tipo' = 'tempo' then 'duration'
    when item->>'meta_tipo' = 'numero' then 'count'
    else 'none'
  end,
  case
    when item->>'meta_tipo' = 'tempo' then 'min'
    else nullif(item->>'meta_unidade', '')
  end,
  nullif(item->>'meta_valor', '')::numeric,
  case
    when coalesce(p.preferencias->'atividades_agenda'->>'modo', 'todos_dias') = 'dias_especificos'
      then jsonb_build_object(
        'kind', 'weekdays',
        'weekdays', coalesce(p.preferencias->'atividades_agenda'->'dias', '[]'::jsonb),
        'times', '[]'::jsonb,
        'period', null,
        'once_at', null
      )
    else '{"kind":"daily","weekdays":[],"times":[],"period":null,"once_at":null}'::jsonb
  end,
  '{"enabled":false,"offset_min":0,"follow_up":false}'::jsonb,
  (ord.ordinality - 1)::integer,
  nullif(item->>'id', '')
from public.profiles p
cross join lateral jsonb_array_elements(coalesce(p.preferencias->'atividades', '[]'::jsonb))
  with ordinality as ord(item, ordinality)
where p.preferencias ? 'atividades'
  and jsonb_typeof(p.preferencias->'atividades') = 'array'
  and jsonb_array_length(p.preferencias->'atividades') > 0
on conflict do nothing;

-- Usuários sem chave atividades, mas com log legado "Atividade:", recebem o catálogo padrão.
insert into public.activities (
  user_id, name, category, template_id, icon, color, metric_kind, metric_unit,
  goal_value, schedule, reminder, sort_order, legacy_id
)
select
  p.id,
  cat.name,
  cat.category,
  cat.template_id,
  cat.icon,
  'emerald',
  cat.metric_kind,
  cat.metric_unit,
  cat.goal_value,
  '{"kind":"daily","weekdays":[],"times":[],"period":null,"once_at":null}'::jsonb,
  '{"enabled":false,"offset_min":0,"follow_up":false}'::jsonb,
  cat.sort_order,
  cat.legacy_id
from public.profiles p
join (
  select distinct usuario_id
  from public.workout_history
  where atividade is not null
     or treino_nome like 'Atividade: %'
) logged on logged.usuario_id = p.id
cross join (
  values
    ('atv_leitura', 'Leitura', 'mente', 'tpl_leitura', 'star', 'count', 'páginas', 5, 0),
    ('atv_estudo', 'Estudar', 'mente', 'tpl_estudo', 'target', 'duration', 'min', 30, 1),
    ('atv_corrida', 'Corrida', 'corpo', 'tpl_corrida', 'zap', 'duration', 'min', 20, 2),
    ('atv_caminhada', 'Caminhada', 'corpo', 'tpl_caminhada', 'sun', 'duration', 'min', 30, 3),
    ('atv_meditacao', 'Meditação', 'mente', 'tpl_meditacao', 'moon', 'duration', 'min', 15, 4),
    ('atv_alongamento', 'Alongamento', 'corpo', 'tpl_alongamento', 'heart', 'duration', 'min', 10, 5)
) as cat(legacy_id, name, category, template_id, icon, metric_kind, metric_unit, goal_value, sort_order)
where not (p.preferencias ? 'atividades')
  and not exists (
    select 1 from public.activities a where a.user_id = p.id
  )
on conflict do nothing;

-- Logs a partir de workout_history de atividade
insert into public.activity_logs (
  user_id, activity_id, activity_name_snapshot, day_key, completed_at, kind,
  metrics, note, duration_min, xp_awarded, leaves_awarded, source, legacy_history_id
)
select
  h.usuario_id,
  a.id,
  coalesce(
    h.atividade->>'nome',
    nullif(regexp_replace(h.treino_nome, '^Atividade:\s*', ''), ''),
    'Atividade'
  ),
  (h.concluido_em at time zone 'America/Sao_Paulo')::date,
  h.concluido_em,
  'full',
  coalesce(h.atividade->'metricas', '{}'::jsonb),
  nullif(h.atividade->>'obs', ''),
  greatest(0, round(h.duracao_total_segundos / 60.0)),
  coalesce(h.xp_ganho, 0),
  0,
  'migrated',
  h.id
from public.workout_history h
left join public.activities a
  on a.user_id = h.usuario_id
 and a.legacy_id = h.atividade->>'atividade_id'
where h.atividade is not null
   or h.treino_nome like 'Atividade: %'
on conflict do nothing;
