-- Retira exercícios removidos do catálogo e das filas recomendadas.
UPDATE exercises
SET ativo = false,
    updated_at = now()
WHERE slug IN (
  'dead-bug',
  'chair-dips',
  'incline-push-up',
  'knee-push-up',
  'toe-touches',
  'bird-dog',
  'thread-the-needle',
  'calf-raise',
  'bear-crawl'
);

UPDATE workout_presets AS preset
SET exercicios = filtered.items,
    updated_at = now()
FROM (
  SELECT
    id,
    COALESCE(jsonb_agg(item) FILTER (
      WHERE item->>'slug' NOT IN (
        'dead-bug',
        'chair-dips',
        'incline-push-up',
        'knee-push-up',
        'toe-touches',
        'bird-dog',
        'thread-the-needle',
        'calf-raise',
        'bear-crawl'
      )
    ), '[]'::jsonb) AS items
  FROM workout_presets
  CROSS JOIN LATERAL jsonb_array_elements(exercicios) AS item
  GROUP BY id
) AS filtered
WHERE preset.id = filtered.id
  AND preset.exercicios IS DISTINCT FROM filtered.items;
