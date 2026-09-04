-- Registro contextual de uma Atividade concluída (páginas lidas, km corridos,
-- matéria estudada, observações do usuário...). Nulo em sessões de treino.
alter table workout_history
  add column if not exists atividade jsonb;

-- Filtra rapidamente as sessões de atividade no calendário/crônica.
create index if not exists workout_history_atividade_idx
  on workout_history ((atividade is not null))
  where atividade is not null;
