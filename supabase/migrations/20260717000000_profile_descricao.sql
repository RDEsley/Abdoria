-- Bio curta do perfil, editável pelo usuário e visível no perfil público.
alter table profiles
  add column if not exists descricao text;
