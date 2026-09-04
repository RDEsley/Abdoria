-- Cutover: remove chaves de atividades/home mortas de preferencias.
-- Só corre depois do código novo estar em produção.

update public.profiles
set preferencias = preferencias
  - 'atividades'
  - 'atividades_fila'
  - 'atividades_agenda'
  - 'atividades_modo_notas'
  - 'home_secoes_ordem'
  - 'home_secoes_ocultas'
where preferencias ?| array[
  'atividades',
  'atividades_fila',
  'atividades_agenda',
  'atividades_modo_notas',
  'home_secoes_ordem',
  'home_secoes_ocultas'
];
