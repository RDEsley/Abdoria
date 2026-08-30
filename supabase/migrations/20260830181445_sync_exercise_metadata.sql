-- Sincroniza metadados usados pelo Player V2 com o catálogo canônico.
-- Linhas legadas permanecem compatíveis pelo resolver compartilhado, enquanto
-- bancos novos e o projeto remoto recebem os valores corretos na fonte.

update public.exercises
set laterality = 'alternating',
    updated_at = now()
where slug in (
  'bicycle-crunch',
  'flutter-kicks',
  'heel-touches',
  'mountain-climbers',
  'scissor-kicks',
  'spiderman-plank',
  'windshield-wipers'
);

update public.exercises
set laterality = 'per_side',
    updated_at = now()
where slug = 'single-leg-glute-bridge';

update public.exercises
set grupos = case slug
  when 'bodyweight-squat' then array['pernas', 'gluteos']
  when 'sumo-squat' then array['pernas', 'gluteos']
  when 'lunge' then array['pernas', 'gluteos']
  when 'reverse-lunge' then array['pernas', 'gluteos']
  when 'glute-bridge' then array['gluteos', 'pernas']
  when 'single-leg-glute-bridge' then array['gluteos', 'pernas']
  when 'wall-sit' then array['pernas', 'gluteos']
  when 'squat-jump' then array['pernas', 'gluteos']
  when 'pike-push-up' then array['ombros', 'bracos']
  when 'superman' then array['costas', 'gluteos']
  else grupos
end,
updated_at = now()
where slug in (
  'bodyweight-squat',
  'sumo-squat',
  'lunge',
  'reverse-lunge',
  'glute-bridge',
  'single-leg-glute-bridge',
  'wall-sit',
  'squat-jump',
  'pike-push-up',
  'superman'
);
