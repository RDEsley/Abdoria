-- Tag única do usuário (#A7K2): permite nomes de exibição repetidos sem conflito.
alter table profiles
  add column if not exists tag text;

create unique index if not exists profiles_tag_key on profiles (tag);
