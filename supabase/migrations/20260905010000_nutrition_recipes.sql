-- Receitas de Alimentação — domínio próprio (macros calculados nos itens em leitura).
-- Acesso via service_role (Express JWT), espelhando nutrition_core.

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.nutrition_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles (id) on delete cascade,
  source text not null default 'user'
    check (source in ('global', 'user')),
  name text not null,
  description text,
  servings numeric(8, 2) not null default 1
    check (servings > 0),
  prep_minutes integer
    check (prep_minutes is null or prep_minutes >= 0),
  difficulty text not null default 'easy'
    check (difficulty in ('easy', 'medium', 'hard')),
  meal_types text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  instructions jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_recipes_source_owner_ck check (
    (source = 'global' and owner_user_id is null)
    or (source = 'user' and owner_user_id is not null)
  ),
  constraint nutrition_recipes_instructions_array_ck check (
    jsonb_typeof(instructions) = 'array'
  )
);

create index if not exists nutrition_recipes_owner_archived_idx
  on public.nutrition_recipes (owner_user_id, archived_at);
create index if not exists nutrition_recipes_global_name_idx
  on public.nutrition_recipes (name)
  where source = 'global' and archived_at is null;
create index if not exists nutrition_recipes_meal_types_gin
  on public.nutrition_recipes using gin (meal_types);
create index if not exists nutrition_recipes_tags_gin
  on public.nutrition_recipes using gin (tags);

drop trigger if exists nutrition_recipes_updated_at on public.nutrition_recipes;
create trigger nutrition_recipes_updated_at
  before update on public.nutrition_recipes
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.nutrition_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.nutrition_recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  quantity numeric(10, 3) not null default 1
    check (quantity > 0),
  grams numeric(10, 2)
    check (grams is null or grams > 0),
  position integer not null default 0,
  note text,
  unique (recipe_id, position)
);

create index if not exists nutrition_recipe_items_recipe_idx
  on public.nutrition_recipe_items (recipe_id, position);
create index if not exists nutrition_recipe_items_food_idx
  on public.nutrition_recipe_items (food_id);

-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.nutrition_recipe_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.nutrition_recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists nutrition_recipe_favorites_user_idx
  on public.nutrition_recipe_favorites (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
alter table public.nutrition_recipes enable row level security;
alter table public.nutrition_recipe_items enable row level security;
alter table public.nutrition_recipe_favorites enable row level security;

revoke all on table public.nutrition_recipes from public, anon, authenticated;
revoke all on table public.nutrition_recipe_items from public, anon, authenticated;
revoke all on table public.nutrition_recipe_favorites from public, anon, authenticated;

grant all on table public.nutrition_recipes to service_role;
grant all on table public.nutrition_recipe_items to service_role;
grant all on table public.nutrition_recipe_favorites to service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed global: 32 receitas BR usando alimentos do catálogo nutrition_core.
-- food_id resolvido por name_fold (fallback name).

do $$
declare
  v_recipe_id uuid;
begin
  -- 1
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Café da manhã clássico',
    'Pão, ovo e café — o básico que funciona.',
    1, 10, 'easy',
    array['breakfast'],
    array['classico', 'rapido'],
    '["Toste ou aqueça o pão francês.","Sirva o ovo cozido ao lado.","Acompanhe com café preto sem açúcar e uma banana."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'pao frances' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'ovo cozido' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'cafe preto sem acucar' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 1, 3);

  -- 2
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Aveia com banana e leite',
    'Mingau rápido, saciante e doce naturalmente.',
    1, 8, 'easy',
    array['breakfast', 'snack'],
    array['aveia', 'fibra', 'rapido'],
    '["Aqueça o leite em fogo baixo.","Incorpore a aveia e mexa até engrossar.","Sirva com banana fatiada por cima."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'aveia em flocos' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'leite integral' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 1, 2);

  -- 3
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Iogurte com granola',
    'Lanche crocante em menos de dois minutos.',
    1, 2, 'easy',
    array['breakfast', 'snack'],
    array['rapido', 'sem_cozimento'],
    '["Coloque o iogurte em uma tigela.","Cubra com granola.","Finalize com banana em rodelas, se quiser."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'iogurte natural' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'granola' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 0.5, 2);

  -- 4
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Tapioca com queijo minas',
    'Clássico nordestino leve para o café.',
    1, 8, 'easy',
    array['breakfast', 'snack'],
    array['tapioca', 'brasileiro'],
    '["Espalhe a goma hidratada na frigideira quente.","Quando firmar, adicione o queijo minas.","Dobre e sirva ainda quente."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tapioca goma hidratada' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'queijo minas frescal' limit 1), 2, 1);

  -- 5
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Tapioca com ovo',
    'Mais proteína no café da manhã.',
    1, 10, 'easy',
    array['breakfast'],
    array['tapioca', 'proteina'],
    '["Prepare a massa de tapioca na frigideira.","Coloque o ovo cozido picado no recheio.","Dobre e sirva."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tapioca goma hidratada' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'ovo cozido' limit 1), 1, 1);

  -- 6
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Pão integral com requeijão',
    'Opção simples e prática para correr.',
    1, 3, 'easy',
    array['breakfast', 'snack'],
    array['rapido', 'integral'],
    '["Espalhe o requeijão light no pão integral.","Acompanhe com café preto."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'pao integral' limit 1), 2, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'requeijao light' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'cafe preto sem acucar' limit 1), 1, 2);

  -- 7
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Omelete de tomate',
    'Ovos com tomate e um fio de azeite.',
    1, 12, 'easy',
    array['breakfast', 'dinner'],
    array['ovo', 'proteina'],
    '["Bata os ovos levemente (use ovo cozido picado ou equivalente fresco).","Refogue o tomate picado no azeite.","Junte os ovos, cozinhe até firmar e sirva."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'ovo cozido' limit 1), 2, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tomate' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 2);

  -- 8
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Shake de whey com banana',
    'Pós-treino rápido e proteico.',
    1, 3, 'easy',
    array['snack'],
    array['proteina', 'pos_treino', 'rapido'],
    '["Bata o whey com o leite até dissolver.","Adicione a banana e bata novamente.","Beba gelado."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'whey protein scoop medio' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'leite integral' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 1, 2);

  -- 9
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Prato de frutas da manhã',
    'Mamão, laranja e banana — leve e hidratante.',
    1, 5, 'easy',
    array['breakfast', 'snack'],
    array['frutas', 'leve', 'vegetariano'],
    '["Corte o mamão e a banana.","Descasque a laranja e sirva em gomos.","Monte o prato e consuma fresco."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'mamao papaia' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'laranja' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 1, 2);

  -- 10
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'PF de frango',
    'Arroz, feijão, frango e salada — almoço BR.',
    1, 25, 'medium',
    array['lunch', 'dinner'],
    array['pf', 'proteina', 'classico'],
    '["Monte o prato com arroz e feijão.","Adicione o frango grelhado.","Finalize com alface, tomate e um fio de azeite."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz branco cozido' limit 1), 3, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'feijao carioca cozido' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'frango grelhado' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'alface' limit 1), 1, 3),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tomate' limit 1), 0.5, 4),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 5);

  -- 11
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'PF de carne magra',
    'Arroz, feijão, carne e batata.',
    1, 30, 'medium',
    array['lunch', 'dinner'],
    array['pf', 'proteina'],
    '["Sirva arroz e feijão no prato.","Acrescente a carne bovina magra grelhada.","Complete com batata cozida."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz branco cozido' limit 1), 3, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'feijao carioca cozido' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'carne bovina magra grelhada' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'batata cozida' limit 1), 1, 3);

  -- 12
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Peixe com brócolis',
    'Tilápia grelhada com legumes e arroz.',
    1, 25, 'medium',
    array['lunch', 'dinner'],
    array['peixe', 'leve'],
    '["Grelhe o peixe com um fio de azeite.","Sirva com arroz branco.","Acompanhe com brócolis cozido."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'peixe grelhado tilapia' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz branco cozido' limit 1), 2, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'brocolis cozido' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 3);

  -- 13
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Macarrão com frango',
    'Massa simples com frango e tomate.',
    1, 20, 'easy',
    array['lunch', 'dinner'],
    array['massa', 'proteina'],
    '["Aqueça o macarrão cozido.","Misture o frango picado e o tomate.","Finalize com azeite e sirva."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'macarrao cozido' limit 1), 1.5, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'frango grelhado' limit 1), 0.8, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tomate' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 3);

  -- 14
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Arroz integral com lentilha',
    'Combinação vegetariana rica em fibra.',
    1, 15, 'easy',
    array['lunch', 'dinner'],
    array['vegetariano', 'fibra', 'integral'],
    '["Monte o prato com arroz integral e lentilha.","Acrescente cenoura crua ralada.","Regue com azeite."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz integral cozido' limit 1), 3, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'lentilha cozida' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'cenoura crua' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 3);

  -- 15
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Salada completa com frango',
    'Salada reforçada para almoço leve.',
    1, 15, 'easy',
    array['lunch', 'dinner'],
    array['salada', 'leve', 'proteina'],
    '["Monte a base com alface, tomate e cenoura.","Adicione o frango grelhado fatiado.","Tempere com azeite."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'alface' limit 1), 2, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tomate' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'cenoura crua' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'frango grelhado' limit 1), 1, 3),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 4);

  -- 16
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Atum com batata-doce',
    'Marmita proteica e prática.',
    1, 20, 'easy',
    array['lunch', 'dinner'],
    array['marmita', 'proteina', 'pos_treino'],
    '["Escorra o atum.","Sirva com batata-doce cozida.","Complete com brócolis."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'atum em agua lata escorrida' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'batata-doce cozida' limit 1), 1.5, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'brocolis cozido' limit 1), 1, 2);

  -- 17
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Marmita fitness frango',
    'Frango, batata-doce e brócolis — clássico da dieta.',
    1, 30, 'medium',
    array['lunch', 'dinner'],
    array['marmita', 'fitness', 'proteina'],
    '["Grelhe o frango.","Cozinhe a batata-doce e o brócolis.","Divida em marmita e leve para o dia."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'frango grelhado' limit 1), 1.2, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'batata-doce cozida' limit 1), 1.5, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'brocolis cozido' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 0.5, 3);

  -- 18
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Arroz, feijão e ovo',
    'Versão econômica e completa do PF.',
    1, 15, 'easy',
    array['lunch', 'dinner'],
    array['pf', 'economico', 'vegetariano'],
    '["Sirva arroz e feijão.","Adicione ovos cozidos.","Finalize com alface."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz branco cozido' limit 1), 3, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'feijao carioca cozido' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'ovo cozido' limit 1), 2, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'alface' limit 1), 1, 3);

  -- 19
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Peixe com mandioca',
    'Combinação nordestina leve.',
    1, 25, 'medium',
    array['lunch', 'dinner'],
    array['peixe', 'brasileiro'],
    '["Sirva o peixe grelhado.","Acompanhe com mandioca cozida.","Adicione folhas de alface."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'peixe grelhado tilapia' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'mandioca cozida' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'alface' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 3);

  -- 20
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Toast de abacate e ovo',
    'Pão integral com abacate e ovo.',
    1, 10, 'easy',
    array['breakfast', 'snack'],
    array['abacate', 'proteina'],
    '["Amasse o abacate e espalhe no pão.","Sirva com ovo cozido.","Tempere levemente com tomate picado."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'pao integral' limit 1), 2, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'abacate' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'ovo cozido' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tomate' limit 1), 0.5, 3);

  -- 21
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Sanduíche de peito de peru',
    'Lanche rápido com peito de peru e requeijão.',
    1, 5, 'easy',
    array['snack', 'lunch'],
    array['lanche', 'rapido'],
    '["Passe requeijão no pão integral.","Monte com peito de peru e alface.","Feche e sirva."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'pao integral' limit 1), 2, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'peito de peru' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'requeijao light' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'alface' limit 1), 1, 3);

  -- 22
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Cottage com mamão',
    'Ceia ou lanche leve e proteico.',
    1, 3, 'easy',
    array['snack', 'supper'],
    array['leve', 'proteina', 'ceia'],
    '["Coloque o cottage em uma tigela.","Adicione mamão picado.","Finalize com granola se quiser crocância."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'queijo cottage' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'mamao papaia' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'granola' limit 1), 0.5, 2);

  -- 23
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Iogurte grego com amendoim',
    'Lanche proteico com gordura boa.',
    1, 2, 'easy',
    array['snack', 'supper'],
    array['proteina', 'rapido'],
    '["Coloque o iogurte grego na tigela.","Adicione banana fatiada.","Polvilhe amendoim torrado."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'iogurte grego natural' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 0.5, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'amendoim torrado' limit 1), 1, 2);

  -- 24
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Maçã com amendoim',
    'Lanche de duas mãos, sem preparo.',
    1, 1, 'easy',
    array['snack'],
    array['rapido', 'sem_cozimento'],
    '["Lave a maçã.","Sirva com uma colher de amendoim torrado."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'maca' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'amendoim torrado' limit 1), 1, 1);

  -- 25
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Pão com queijo e suco',
    'Lanche clássico da tarde.',
    1, 5, 'easy',
    array['snack', 'breakfast'],
    array['classico', 'rapido'],
    '["Recheie o pão francês com queijo minas.","Sirva com suco de laranja natural."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'pao frances' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'queijo minas frescal' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'suco de laranja natural' limit 1), 1, 2);

  -- 26
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Ceia leve de iogurte',
    'Iogurte e maçã antes de dormir.',
    1, 2, 'easy',
    array['supper', 'snack'],
    array['ceia', 'leve'],
    '["Sirva o iogurte natural.","Acompanhe com maçã fatiada."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'iogurte natural' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'maca' limit 1), 1, 1);

  -- 27
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Chocolate 70% com café',
    'Pequeno prazer controlado.',
    1, 1, 'easy',
    array['snack'],
    array['doce', 'rapido'],
    '["Prepare o café preto.","Acompanhe com dois quadrados de chocolate 70%."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'chocolate 70%' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'cafe preto sem acucar' limit 1), 1, 1);

  -- 28
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Batata com ovo e azeite',
    'Jantar simples e reconfortante.',
    1, 20, 'easy',
    array['dinner', 'lunch'],
    array['simples', 'economico'],
    '["Aqueça a batata cozida.","Sirva com ovos.","Regue com azeite."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'batata cozida' limit 1), 1.5, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'ovo cozido' limit 1), 2, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 2);

  -- 29
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Frango com arroz integral',
    'Versão mais fibrosa do PF de frango.',
    1, 25, 'easy',
    array['lunch', 'dinner'],
    array['integral', 'proteina', 'fitness'],
    '["Sirva o arroz integral.","Adicione o frango grelhado.","Complete com alface."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz integral cozido' limit 1), 3, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'frango grelhado' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'alface' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 0.5, 3);

  -- 30
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Lentilha com legumes',
    'Prato vegetariano colorido.',
    1, 15, 'easy',
    array['lunch', 'dinner'],
    array['vegetariano', 'fibra', 'vegano'],
    '["Aqueça a lentilha.","Misture cenoura e brócolis.","Tempere com azeite."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'lentilha cozida' limit 1), 1.5, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'cenoura crua' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'brocolis cozido' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 3);

  -- 31
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Overnight oats estilo BR',
    'Aveia de molho no iogurte, pronta na geladeira.',
    1, 5, 'easy',
    array['breakfast'],
    array['aveia', 'meal_prep', 'rapido'],
    '["Misture aveia e iogurte em um pote.","Adicione banana e granola.","Leve à geladeira por algumas horas ou overnight."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'aveia em flocos' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'iogurte natural' limit 1), 1, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'banana prata' limit 1), 0.5, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'granola' limit 1), 0.5, 3);

  -- 32
  insert into public.nutrition_recipes (
    source, name, description, servings, prep_minutes, difficulty,
    meal_types, tags, instructions, verified
  ) values (
    'global',
    'Tilápia com tomate e arroz',
    'Peixe temperado com tomate e arroz soltinho.',
    1, 25, 'medium',
    array['lunch', 'dinner'],
    array['peixe', 'leve'],
    '["Grelhe a tilápia com azeite.","Sirva com arroz branco.","Finalize com tomate fresco picado."]'::jsonb,
    true
  ) returning id into v_recipe_id;
  insert into public.nutrition_recipe_items (recipe_id, food_id, quantity, position) values
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'peixe grelhado tilapia' limit 1), 1, 0),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'arroz branco cozido' limit 1), 2.5, 1),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'tomate' limit 1), 1, 2),
    (v_recipe_id, (select id from public.foods where source = 'global' and name_fold = 'azeite de oliva' limit 1), 1, 3);

end $$;
