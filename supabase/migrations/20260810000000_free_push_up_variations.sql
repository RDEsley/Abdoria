-- A prancha de flexão passa a ser apenas um acessório opcional do perfil.
-- O catálogo usa variações livres equivalentes, sem equipamento obrigatório.

INSERT INTO exercises (
  slug,
  nome,
  nome_pt,
  nivel,
  musculo_principal,
  musculos_secundarios,
  tempo_recomendado,
  prioridade,
  modo,
  repeticoes_iniciante,
  repeticoes_intermediario,
  repeticoes_avancado,
  descricao,
  media,
  ativo,
  equipamento,
  grupos,
  contraindicacoes
)
VALUES
  (
    'wide-push-up', 'Wide Push-Up', 'Flexão aberta', 2, 'superior', ARRAY['core'], 30, 'A',
    'reps', 6, 10, 15, 'Foco: peito. Mãos mais abertas que os ombros e descida controlada.',
    '{"gif":"push-up.gif"}'::jsonb, true, NULL, ARRAY['peito', 'bracos'], ARRAY['punhos']
  ),
  (
    'close-grip-push-up', 'Close-Grip Push-Up', 'Flexão fechada', 2, 'superior', ARRAY['core'],
    30, 'A', 'reps', 5, 9, 13, 'Foco: tríceps. Mãos próximas e cotovelos junto ao corpo.',
    '{"gif":"push-up.gif"}'::jsonb, true, NULL, ARRAY['bracos', 'peito'], ARRAY['punhos']
  ),
  (
    'diamond-push-up', 'Diamond Push-Up', 'Flexão diamante', 3, 'superior', ARRAY['core'], 30,
    'A', 'reps', 4, 8, 12, 'Foco: tríceps. Mãos juntas sob o peito formando um diamante.',
    '{"gif":"push-up.gif"}'::jsonb, true, NULL, ARRAY['bracos', 'peito'], ARRAY['punhos']
  ),
  (
    'pseudo-planche-push-up', 'Pseudo Planche Push-Up', 'Flexão pseudo planche', 4, 'superior',
    ARRAY['core'], 30, 'B', 'reps', 3, 6, 10,
    'Foco: ombros. Incline o corpo à frente e mantenha os cotovelos controlados.',
    '{"gif":"pike-push-up.gif"}'::jsonb, true, NULL, ARRAY['ombros', 'bracos'], ARRAY['ombros', 'punhos']
  ),
  (
    'scapular-push-up', 'Scapular Push-Up', 'Flexão escapular', 2, 'superior', ARRAY['core'], 30,
    'B', 'reps', 8, 12, 16,
    'Foco: costas. Braços estendidos; aproxime e afaste as escápulas sem dobrar os cotovelos.',
    '{"gif":"push-up.gif"}'::jsonb, true, NULL, ARRAY['costas', 'ombros'], ARRAY['ombros', 'punhos']
  ),
  (
    'wide-scapular-push-up', 'Wide Scapular Push-Up', 'Flexão escapular aberta', 3, 'superior',
    ARRAY['core', 'obliquos'], 30, 'B', 'reps', 8, 12, 15,
    'Foco: costas. Mãos abertas e movimento curto apenas das escápulas.',
    '{"gif":"push-up.gif"}'::jsonb, true, NULL, ARRAY['costas', 'ombros'], ARRAY['ombros', 'punhos']
  )
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  nome_pt = EXCLUDED.nome_pt,
  nivel = EXCLUDED.nivel,
  musculo_principal = EXCLUDED.musculo_principal,
  musculos_secundarios = EXCLUDED.musculos_secundarios,
  tempo_recomendado = EXCLUDED.tempo_recomendado,
  prioridade = EXCLUDED.prioridade,
  modo = EXCLUDED.modo,
  repeticoes_iniciante = EXCLUDED.repeticoes_iniciante,
  repeticoes_intermediario = EXCLUDED.repeticoes_intermediario,
  repeticoes_avancado = EXCLUDED.repeticoes_avancado,
  descricao = EXCLUDED.descricao,
  media = EXCLUDED.media,
  ativo = true,
  equipamento = NULL,
  grupos = EXCLUDED.grupos,
  contraindicacoes = EXCLUDED.contraindicacoes,
  updated_at = now();

UPDATE exercises
SET descricao = CASE slug
  WHEN 'push-up' THEN 'Foco: peito. Flexão clássica com mãos na largura dos ombros.'
  WHEN 'knee-push-up' THEN 'Foco: peito. Versão mais leve com os joelhos apoiados no chão.'
  WHEN 'incline-push-up' THEN 'Foco: peito. Mãos elevadas em um apoio firme para reduzir a carga.'
  WHEN 'decline-push-up' THEN 'Foco: peito. Pés elevados para aumentar a carga na parte superior do peito.'
  WHEN 'pike-push-up' THEN 'Foco: ombros. Forme um V invertido e desça a cabeça entre as mãos.'
END,
equipamento = NULL,
ativo = true,
updated_at = now()
WHERE slug IN ('push-up', 'knee-push-up', 'incline-push-up', 'decline-push-up', 'pike-push-up');

UPDATE exercises
SET ativo = false,
    updated_at = now()
WHERE slug IN (
  'push-up-board-chest',
  'push-up-board-chest-wide',
  'push-up-board-decline',
  'push-up-board-triceps',
  'push-up-board-triceps-diamond',
  'push-up-board-shoulders',
  'push-up-board-shoulders-pike',
  'push-up-board-back',
  'push-up-board-back-wide'
);
