-- Alimentos BR extras (curados) que ainda não estão no seed de nutrition_core.
-- Idempotente por name_fold global.

insert into public.foods (
  source, name, name_fold, serving_description, serving_grams,
  calories, protein_g, carbs_g, fat_g, fiber_g, verified
)
select *
from (
  values
    (
      'global'::text, 'Cuscuz de milho cozido'::text, 'cuscuz de milho cozido'::text,
      '1 fatia (70 g)'::text, 70::numeric, 78::numeric, 1.8::numeric, 17.0::numeric, 0.3::numeric, 1.2::numeric, true
    ),
    (
      'global', 'Queijo mussarela', 'queijo mussarela',
      '1 fatia (20 g)', 20, 66, 4.5, 0.4, 5.2, 0, true
    ),
    (
      'global', 'Mel', 'mel',
      '1 colher de sopa (15 g)', 15, 46, 0.1, 12.5, 0, 0, true
    ),
    (
      'global', 'Espinafre refogado', 'espinafre refogado',
      '1 xícara (100 g)', 100, 40, 3.0, 3.5, 2.0, 2.5, true
    ),
    (
      'global', 'Grão-de-bico cozido', 'grao-de-bico cozido',
      '1 concha (80 g)', 80, 110, 6.0, 18.0, 2.0, 5.0, true
    ),
    (
      'global', 'Couve refogada', 'couve refogada',
      '1 xícara (60 g)', 60, 35, 2.0, 4.0, 1.5, 2.0, true
    ),
    (
      'global', 'Beterraba cozida', 'beterraba cozida',
      '100 g', 100, 44, 1.7, 10.0, 0.2, 2.0, true
    ),
    (
      'global', 'Castanha de caju torrada', 'castanha de caju torrada',
      '1 colher (15 g)', 15, 85, 2.5, 4.5, 6.5, 0.5, true
    ),
    (
      'global', 'Leite desnatado', 'leite desnatado',
      '1 copo (200 ml)', 200, 70, 6.8, 9.6, 0.2, 0, true
    ),
    (
      'global', 'Pão de forma integral', 'pao de forma integral',
      '1 fatia (25 g)', 25, 62, 2.8, 11.0, 1.0, 1.8, true
    )
) as v(
  source, name, name_fold, serving_description, serving_grams,
  calories, protein_g, carbs_g, fat_g, fiber_g, verified
)
where not exists (
  select 1
  from public.foods f
  where f.source = 'global'
    and f.name_fold = v.name_fold
    and f.archived_at is null
);
