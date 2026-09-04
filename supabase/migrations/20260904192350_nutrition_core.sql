-- Alimentação / Nutrição — domínio próprio (não em preferencias JSON).
-- Acesso via service_role (Express JWT), espelhando activities.

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.nutrition_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  goal text not null default 'track'
    check (goal in ('maintain', 'gain', 'lose', 'track')),
  target_mode text not null default 'none'
    check (target_mode in ('none', 'manual', 'estimated')),
  calorie_target integer,
  protein_target_g numeric(8, 2),
  carbs_target_g numeric(8, 2),
  fat_target_g numeric(8, 2),
  activity_factor numeric(4, 2),
  setup_completed_at timestamptz,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists nutrition_profiles_updated_at on public.nutrition_profiles;
create trigger nutrition_profiles_updated_at
  before update on public.nutrition_profiles
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles (id) on delete cascade,
  source text not null default 'user'
    check (source in ('global', 'user')),
  name text not null,
  brand text,
  serving_description text not null default 'porção',
  serving_grams numeric(10, 2),
  calories numeric(10, 2) not null default 0,
  protein_g numeric(10, 2) not null default 0,
  carbs_g numeric(10, 2) not null default 0,
  fat_g numeric(10, 2) not null default 0,
  fiber_g numeric(10, 2),
  sodium_mg numeric(10, 2),
  name_fold text not null default '',
  verified boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_source_owner_ck check (
    (source = 'global' and owner_user_id is null)
    or (source = 'user' and owner_user_id is not null)
  ),
  constraint foods_nonneg_ck check (
    calories >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0
    and (fiber_g is null or fiber_g >= 0)
    and (sodium_mg is null or sodium_mg >= 0)
    and (serving_grams is null or serving_grams > 0)
  )
);

create index if not exists foods_owner_archived_idx
  on public.foods (owner_user_id, archived_at);
create index if not exists foods_global_name_idx
  on public.foods (name_fold)
  where source = 'global' and archived_at is null;
create index if not exists foods_user_name_idx
  on public.foods (owner_user_id, name_fold)
  where source = 'user' and archived_at is null;

drop trigger if exists foods_updated_at on public.foods;
create trigger foods_updated_at
  before update on public.foods
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.food_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create index if not exists food_favorites_user_idx
  on public.food_favorites (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name_snapshot text not null,
  serving_description_snapshot text not null default 'porção',
  serving_grams_snapshot numeric(10, 2),
  meal_type text not null
    check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner', 'supper', 'other')),
  quantity numeric(10, 3) not null default 1,
  grams numeric(10, 2),
  calories numeric(10, 2) not null default 0,
  protein_g numeric(10, 2) not null default 0,
  carbs_g numeric(10, 2) not null default 0,
  fat_g numeric(10, 2) not null default 0,
  fiber_g numeric(10, 2),
  eaten_at timestamptz not null default now(),
  day_key date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_logs_qty_ck check (quantity > 0),
  constraint food_logs_macros_ck check (
    calories >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0
  )
);

create index if not exists food_logs_user_day_idx
  on public.food_logs (user_id, day_key desc, eaten_at);
create index if not exists food_logs_user_meal_day_idx
  on public.food_logs (user_id, day_key, meal_type);

drop trigger if exists food_logs_updated_at on public.food_logs;
create trigger food_logs_updated_at
  before update on public.food_logs
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric(6, 2) not null,
  day_key date not null,
  recorded_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  constraint weight_logs_range_ck check (weight_kg > 20 and weight_kg < 400)
);

create unique index if not exists weight_logs_user_day_uidx
  on public.weight_logs (user_id, day_key);
create index if not exists weight_logs_user_day_idx
  on public.weight_logs (user_id, day_key desc);

-- ═══════════════════════════════════════════════════════════════════════════
alter table public.nutrition_profiles enable row level security;
alter table public.foods enable row level security;
alter table public.food_favorites enable row level security;
alter table public.food_logs enable row level security;
alter table public.weight_logs enable row level security;

revoke all on table public.nutrition_profiles from public, anon, authenticated;
revoke all on table public.foods from public, anon, authenticated;
revoke all on table public.food_favorites from public, anon, authenticated;
revoke all on table public.food_logs from public, anon, authenticated;
revoke all on table public.weight_logs from public, anon, authenticated;

grant all on table public.nutrition_profiles to service_role;
grant all on table public.foods to service_role;
grant all on table public.food_favorites to service_role;
grant all on table public.food_logs to service_role;
grant all on table public.weight_logs to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Catálogo global enxuto (alimentos comuns BR). name_fold sem acento.
insert into public.foods (
  source, name, name_fold, serving_description, serving_grams,
  calories, protein_g, carbs_g, fat_g, fiber_g, verified
) values
  ('global', 'Arroz branco cozido', 'arroz branco cozido', '1 colher de servir (45 g)', 45, 58, 1.2, 12.6, 0.1, 0.2, true),
  ('global', 'Feijão carioca cozido', 'feijao carioca cozido', '1 concha (86 g)', 86, 76, 4.8, 13.6, 0.5, 7.1, true),
  ('global', 'Ovo cozido', 'ovo cozido', '1 unidade (50 g)', 50, 74, 6.5, 0.6, 5.0, 0, true),
  ('global', 'Frango grelhado', 'frango grelhado', '100 g', 100, 159, 32.0, 0, 2.5, 0, true),
  ('global', 'Carne bovina magra grelhada', 'carne bovina magra grelhada', '100 g', 100, 219, 32.0, 0, 9.0, 0, true),
  ('global', 'Peixe grelhado (tilápia)', 'peixe grelhado tilapia', '100 g', 100, 128, 26.0, 0, 2.5, 0, true),
  ('global', 'Pão francês', 'pao frances', '1 unidade (50 g)', 50, 150, 4.0, 29.0, 1.6, 1.2, true),
  ('global', 'Leite integral', 'leite integral', '1 copo (200 ml)', 200, 120, 6.4, 9.0, 6.4, 0, true),
  ('global', 'Iogurte natural', 'iogurte natural', '1 pote (170 g)', 170, 91, 7.0, 7.5, 3.0, 0, true),
  ('global', 'Queijo minas frescal', 'queijo minas frescal', '1 fatia (30 g)', 30, 79, 5.2, 0.9, 6.1, 0, true),
  ('global', 'Aveia em flocos', 'aveia em flocos', '3 colheres (30 g)', 30, 118, 4.2, 20.0, 2.3, 2.8, true),
  ('global', 'Banana prata', 'banana prata', '1 unidade (100 g)', 100, 98, 1.3, 26.0, 0.1, 2.0, true),
  ('global', 'Maçã', 'maca', '1 unidade (130 g)', 130, 73, 0.3, 19.0, 0.2, 2.0, true),
  ('global', 'Mamão papaia', 'mamao papaia', '1 fatia (100 g)', 100, 40, 0.5, 10.0, 0.1, 1.0, true),
  ('global', 'Laranja', 'laranja', '1 unidade (130 g)', 130, 61, 1.2, 15.0, 0.2, 2.0, true),
  ('global', 'Batata cozida', 'batata cozida', '100 g', 100, 52, 1.2, 12.0, 0.1, 1.3, true),
  ('global', 'Batata-doce cozida', 'batata-doce cozida', '100 g', 100, 77, 0.6, 18.0, 0.1, 2.2, true),
  ('global', 'Macarrão cozido', 'macarrao cozido', '1 prato (100 g)', 100, 131, 4.5, 25.0, 0.9, 1.5, true),
  ('global', 'Tapioca (goma hidratada)', 'tapioca goma hidratada', '1 unidade média (50 g)', 50, 80, 0.1, 20.0, 0, 0, true),
  ('global', 'Café preto sem açúcar', 'cafe preto sem acucar', '1 xícara (50 ml)', 50, 2, 0.1, 0.3, 0, 0, true),
  ('global', 'Azeite de oliva', 'azeite de oliva', '1 colher de sopa (8 g)', 8, 72, 0, 0, 8.0, 0, true),
  ('global', 'Abacate', 'abacate', '2 colheres (50 g)', 50, 96, 1.0, 3.0, 9.0, 3.0, true),
  ('global', 'Brócolis cozido', 'brocolis cozido', '1 xícara (100 g)', 100, 25, 2.1, 4.4, 0.3, 2.9, true),
  ('global', 'Alface', 'alface', '1 xícara (50 g)', 50, 7, 0.7, 1.2, 0.1, 0.8, true),
  ('global', 'Tomate', 'tomate', '1 unidade (100 g)', 100, 15, 0.9, 3.1, 0.2, 1.2, true),
  ('global', 'Cenoura crua', 'cenoura crua', '1 unidade (60 g)', 60, 25, 0.6, 5.7, 0.1, 1.9, true),
  ('global', 'Whey protein (scoop médio)', 'whey protein scoop medio', '1 scoop (30 g)', 30, 120, 24.0, 2.0, 1.5, 0, true),
  ('global', 'Atum em água (lata escorrida)', 'atum em agua lata escorrida', '100 g', 100, 116, 26.0, 0, 1.0, 0, true),
  ('global', 'Queijo cottage', 'queijo cottage', '2 colheres (50 g)', 50, 49, 6.0, 1.5, 2.0, 0, true),
  ('global', 'Pão integral', 'pao integral', '1 fatia (30 g)', 30, 75, 3.0, 13.0, 1.2, 2.0, true),
  ('global', 'Requeijão light', 'requeijao light', '1 colher (20 g)', 20, 35, 2.0, 1.0, 2.5, 0, true),
  ('global', 'Suco de laranja natural', 'suco de laranja natural', '1 copo (200 ml)', 200, 90, 1.4, 21.0, 0.2, 0.4, true),
  ('global', 'Granola', 'granola', '2 colheres (30 g)', 30, 140, 3.0, 20.0, 5.0, 2.5, true),
  ('global', 'Amendoim torrado', 'amendoim torrado', '1 colher (15 g)', 15, 90, 4.0, 2.5, 7.5, 1.0, true),
  ('global', 'Chocolate 70%', 'chocolate 70%', '2 quadrados (20 g)', 20, 110, 1.5, 8.0, 8.0, 2.0, true),
  ('global', 'Arroz integral cozido', 'arroz integral cozido', '1 colher de servir (45 g)', 45, 56, 1.3, 11.5, 0.4, 1.0, true),
  ('global', 'Lentilha cozida', 'lentilha cozida', '1 concha (80 g)', 80, 75, 5.5, 12.5, 0.3, 4.0, true),
  ('global', 'Iogurte grego natural', 'iogurte grego natural', '1 pote (100 g)', 100, 97, 9.0, 3.5, 5.0, 0, true),
  ('global', 'Peito de peru', 'peito de peru', '2 fatias (40 g)', 40, 42, 8.0, 0.5, 0.8, 0, true),
  ('global', 'Mandioca cozida', 'mandioca cozida', '100 g', 100, 125, 0.6, 30.0, 0.3, 1.6, true);
