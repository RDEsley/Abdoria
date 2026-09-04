-- Identidade de perfil: foto (Supabase Storage) e contador de trocas de nome.
alter table profiles
  add column if not exists avatar_url text,
  add column if not exists nome_trocas int not null default 0;

-- Bucket público das fotos de perfil (idempotente).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
