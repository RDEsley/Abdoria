-- Feed paginado de histórico (Fase 7.4) passa a filtrar por usuario_id e cursor de
-- concluido_em em toda página; sem índice, essa query faz sequential scan.
CREATE INDEX IF NOT EXISTS idx_workout_history_usuario_concluido
  ON workout_history (usuario_id, concluido_em DESC);
