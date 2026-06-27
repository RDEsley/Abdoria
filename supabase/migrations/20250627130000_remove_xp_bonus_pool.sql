-- Remove legacy XP bonus pool fields from xp_diario JSONB.
ALTER TABLE profiles
  ALTER COLUMN xp_diario SET DEFAULT '{"ganho_hoje":0,"data_reset":""}'::jsonb;

UPDATE profiles
SET xp_diario = (xp_diario - 'extra_hoje' - 'bonus_pool_restante' - 'bonus_pool_total')
WHERE xp_diario ?| array['extra_hoje', 'bonus_pool_restante', 'bonus_pool_total'];
