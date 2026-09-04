-- Dia Ativo: uma linha por usuário/dia civil em America/Sao_Paulo.
-- Fonte única do Streak. Dias congelados continuam em gamificacao.streak_congelamentos.

create table if not exists public.active_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_key date not null,
  first_source text not null,
  sources text[] not null default '{}',
  first_at timestamptz not null,
  primary key (user_id, day_key)
);

create index if not exists idx_active_days_user_day
  on public.active_days (user_id, day_key desc);

alter table public.active_days enable row level security;
revoke all on table public.active_days from anon, authenticated, public;

create or replace function public.record_valid_daily_action(
  p_user_id uuid,
  p_source text,
  p_at timestamptz default now()
)
returns public.active_days
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_day date;
  v_row public.active_days;
begin
  v_day := (p_at at time zone 'America/Sao_Paulo')::date;
  insert into public.active_days (user_id, day_key, first_source, sources, first_at)
  values (p_user_id, v_day, p_source, array[p_source], p_at)
  on conflict (user_id, day_key) do update
    set sources = case
      when public.active_days.sources @> array[excluded.first_source]
      then public.active_days.sources
      else public.active_days.sources || excluded.first_source
    end
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.record_valid_daily_action(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_valid_daily_action(uuid, text, timestamptz) to service_role;

insert into public.active_days (user_id, day_key, first_source, sources, first_at)
select
  f.usuario_id,
  f.day_key,
  f.first_source,
  s.sources,
  f.first_at
from (
  select distinct on (
    usuario_id,
    (concluido_em at time zone 'America/Sao_Paulo')::date
  )
    usuario_id,
    (concluido_em at time zone 'America/Sao_Paulo')::date as day_key,
    case
      when atividade is null then 'workout_completed'
      else 'activity_completed'
    end as first_source,
    concluido_em as first_at
  from public.workout_history
  order by
    usuario_id,
    (concluido_em at time zone 'America/Sao_Paulo')::date,
    concluido_em asc
) f
join (
  select
    usuario_id,
    (concluido_em at time zone 'America/Sao_Paulo')::date as day_key,
    array_agg(distinct case
      when atividade is null then 'workout_completed'
      else 'activity_completed'
    end) as sources
  from public.workout_history
  group by 1, 2
) s
  on s.usuario_id = f.usuario_id
 and s.day_key = f.day_key
on conflict (user_id, day_key) do nothing;
