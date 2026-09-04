-- Abdoria initial schema (mirrors apply_migration on remote)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  nome TEXT NOT NULL,
  idade INT,
  peso_kg NUMERIC,
  altura_cm NUMERIC,
  imc NUMERIC,
  nivel TEXT NOT NULL DEFAULT 'iniciante',
  objetivo TEXT NOT NULL DEFAULT 'definicao',
  gamificacao JSONB NOT NULL DEFAULT '{"nivel_xp":0,"streak_atual":0,"streak_maior":0,"total_minutos":0,"conquistas":[]}'::jsonb,
  cosmeticos JSONB NOT NULL DEFAULT '{}'::jsonb,
  loja_diaria JSONB NOT NULL DEFAULT '{"data_reset":"","slots":[]}'::jsonb,
  simulacao_definicao JSONB NOT NULL DEFAULT '{"gordura_meta_pct":12}'::jsonb,
  preferencias JSONB NOT NULL DEFAULT '{}'::jsonb,
  dados_salvos JSONB NOT NULL DEFAULT '{"treino_personalizado":[],"treinos_salvos":[],"esquemas_reps":{},"exercicios_desbloqueados":[]}'::jsonb,
  xp_diario JSONB NOT NULL DEFAULT '{"ganho_hoje":0,"extra_hoje":0,"data_reset":"","bonus_pool_restante":0,"bonus_pool_total":0}'::jsonb,
  inventario JSONB NOT NULL DEFAULT '{"itens":[]}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  muscle_map_reset_at TIMESTAMPTZ,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  is_demo_npc BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_afk_state (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ,
  minutos_acumulados INT NOT NULL DEFAULT 0,
  pending JSONB NOT NULL DEFAULT '{"xp":0,"abdoria":0,"energy_drinks":0,"cosmetic_ids":[],"titulo_secreto":false}'::jsonb,
  combat JSONB NOT NULL DEFAULT '{"kills_total":0,"kills_until_boss":0,"enemy_id":"bat","enemy_hp":24,"is_boss":false,"elite":false}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  nome_pt TEXT,
  nivel INT NOT NULL,
  musculo_principal TEXT NOT NULL,
  musculos_secundarios TEXT[] NOT NULL DEFAULT '{}',
  tempo_recomendado INT NOT NULL,
  prioridade TEXT NOT NULL,
  modo TEXT NOT NULL DEFAULT 'reps',
  repeticoes_iniciante INT DEFAULT 12,
  repeticoes_intermediario INT DEFAULT 16,
  repeticoes_avancado INT DEFAULT 20,
  tempo_seg_iniciante INT DEFAULT 25,
  tempo_seg_intermediario INT DEFAULT 35,
  tempo_seg_avancado INT DEFAULT 45,
  descanso_seg_iniciante INT DEFAULT 40,
  descanso_seg_intermediario INT DEFAULT 25,
  descanso_seg_avancado INT DEFAULT 18,
  descricao TEXT,
  media JSONB NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workout_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  nivel TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  ciclo_id TEXT NOT NULL,
  descricao TEXT NOT NULL,
  recomendado BOOLEAN NOT NULL DEFAULT true,
  exercicios JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  treino_nome TEXT NOT NULL,
  treino_tipo TEXT,
  exercicios JSONB NOT NULL DEFAULT '[]'::jsonb,
  duracao_total_segundos INT NOT NULL DEFAULT 0,
  musculos_estimulados TEXT[] NOT NULL DEFAULT '{}',
  xp_ganho INT NOT NULL DEFAULT 0,
  concluido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leaderboard_week_payouts (
  week_key TEXT PRIMARY KEY,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gift_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);
