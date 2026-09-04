-- Grupo H — Onboarding "personal trainer" + motor de plano.
-- perfil_treino: respostas do questionário (escopo, foco, partes, frequência,
--   tempo por sessão, restrições). NULL = usuário legado (pipeline de presets).
-- plano_treino: esqueleto do plano gerado (dias, grupos, ênfases). NULL = legado.
-- exercises.grupos: partes do corpo trabalhadas (primeira = principal) — taxonomia
--   nova ao lado de musculo_principal (que segue abdominal e intocado).
-- exercises.contraindicacoes: regiões sensíveis que excluem o exercício.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS perfil_treino JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plano_treino JSONB;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS grupos TEXT[] NOT NULL DEFAULT '{abdomen}';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS contraindicacoes TEXT[] NOT NULL DEFAULT '{}';

-- Dia do plano corpo-todo concluído pelo treino (NULL = treino fora do modo plano).
ALTER TABLE workout_history ADD COLUMN IF NOT EXISTS plano_dia_indice INTEGER;
