-- Perfil abdominal V2. JSONB mantém evolução compatível sem apagar perfil_treino legado.
alter table public.profiles
  add column if not exists ab_training_profile_v2 jsonb;

alter table public.workout_history add column if not exists completion_id uuid;
create unique index if not exists workout_history_user_completion_uidx
  on public.workout_history (usuario_id, completion_id) where completion_id is not null;

alter table public.exercises
  add column if not exists laterality text not null default 'none'
  check (laterality in ('none', 'per_side', 'alternating'));

update public.exercises
set laterality = 'per_side'
where slug in ('side-plank', 'copenhagen-plank');

update public.exercises
set laterality = 'alternating'
where slug in ('russian-twist');
