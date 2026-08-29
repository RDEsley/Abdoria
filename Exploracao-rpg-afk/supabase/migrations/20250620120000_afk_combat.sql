ALTER TABLE user_afk_state
  ADD COLUMN IF NOT EXISTS combat JSONB NOT NULL DEFAULT '{
    "kills_total": 0,
    "kills_until_boss": 0,
    "enemy_id": "bat",
    "enemy_hp": 24,
    "is_boss": false,
    "elite": false
  }'::jsonb;
