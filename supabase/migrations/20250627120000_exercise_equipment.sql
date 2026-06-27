-- Equipamento opcional exigido por exercícios gated (push_up_board, pull_up_bar, ab_wheel).
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS equipamento TEXT;

CREATE INDEX IF NOT EXISTS idx_exercises_equipamento ON exercises (equipamento)
  WHERE equipamento IS NOT NULL;
