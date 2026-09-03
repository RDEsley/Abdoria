-- Agenda por item de rotina: horário opcional e opt-in de lembrete por item.
-- Aditivo apenas — não altera dados existentes em routine_items.

alter table public.routine_items
  add column if not exists scheduled_time text,
  add column if not exists reminder_enabled boolean not null default false;

-- Validação leve de formato HH:MM (validação completa fica na camada de app).
alter table public.routine_items
  drop constraint if exists routine_items_scheduled_time_format;
alter table public.routine_items
  add constraint routine_items_scheduled_time_format
  check (scheduled_time is null or scheduled_time ~ '^([01]\d|2[0-3]):[0-5]\d$');
