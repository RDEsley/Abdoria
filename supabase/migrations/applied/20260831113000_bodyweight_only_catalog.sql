-- Evolyn passa a trabalhar exclusivamente com exercícios de peso corporal.
-- Flexões que tinham a prancha apenas como acessório continuam válidas sem ela.
update public.exercises
set equipamento = null
where equipamento = 'push_up_board';

-- Os demais movimentos dependentes de acessórios permanecem no histórico,
-- porém deixam de participar do catálogo, recomendações e novas filas.
update public.exercises
set ativo = false
where equipamento is not null;

-- Keep persisted presets aligned with the active bodyweight catalog.
update public.workout_presets as preset
set
  exercicios = filtered.items,
  updated_at = now()
from (
  select
    workout.id,
    coalesce(
      jsonb_agg(entry.item order by entry.position)
        filter (where active_exercise.slug is not null),
      '[]'::jsonb
    ) as items
  from public.workout_presets as workout
  cross join lateral jsonb_array_elements(workout.exercicios)
    with ordinality as entry(item, position)
  left join public.exercises as active_exercise
    on active_exercise.slug = entry.item->>'slug'
    and active_exercise.ativo = true
    and active_exercise.equipamento is null
  group by workout.id
) as filtered
where preset.id = filtered.id
  and preset.exercicios is distinct from filtered.items;

-- Remove escolhas antigas do perfil sem apagar outras preferências do usuário.
update public.profiles
set
  preferencias = (preferencias - 'equipamentos') #- '{ab_training_profile_v2,equipment}',
  ab_training_profile_v2 = case
    when ab_training_profile_v2 is null then null
    else ab_training_profile_v2 - 'equipment'
  end
where
  preferencias ? 'equipamentos'
  or preferencias #> '{ab_training_profile_v2,equipment}' is not null
  or ab_training_profile_v2 ? 'equipment';
