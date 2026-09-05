import type { DayNutritionSummary } from '@shared/nutrition';

type DayPayload = DayNutritionSummary & {
  suggestions?: Array<{ kind: string; message: string; hint?: string }>;
};

function MacroTile({
  label,
  value,
  target,
  showTarget,
}: {
  label: string;
  value: number;
  target: number | null | undefined;
  showTarget: boolean;
}) {
  const pct =
    showTarget && target != null && target > 0
      ? Math.min(100, Math.round((value / target) * 100))
      : null;
  return (
    <div className="nutrition-macro-tile">
      <strong>
        {label} {Math.round(value)}g
      </strong>
      {showTarget && target != null ? (
        <small>meta {Math.round(target)}g</small>
      ) : (
        <small>hoje</small>
      )}
      {pct != null && (
        <div className="nutrition-bar nutrition-bar--sm" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function NutritionDaySummary({ day }: { day: DayPayload | null }) {
  const totals = day?.totals;
  const targets = day?.targets;
  const hasTargets =
    targets != null &&
    targets.target_mode !== 'none' &&
    (targets.calorie_target != null ||
      targets.protein_target_g != null ||
      targets.carbs_target_g != null ||
      targets.fat_target_g != null);

  const calories = Math.round(totals?.calories ?? 0);
  const calorieTarget = targets?.calorie_target;
  const caloriePct =
    hasTargets && calorieTarget != null && calorieTarget > 0
      ? Math.min(100, Math.round((calories / calorieTarget) * 100))
      : null;

  return (
    <section className="nutrition-summary">
      <div className="nutrition-summary__calories">
        <strong>{calories}</strong>
        <span>
          {hasTargets && calorieTarget != null
            ? `de ${calorieTarget} kcal · referência ${
                targets?.target_mode === 'estimated' ? 'estimada' : 'manual'
              }`
            : 'kcal hoje'}
        </span>
        {caloriePct != null && (
          <div className="nutrition-bar" aria-hidden>
            <i style={{ width: `${caloriePct}%` }} />
          </div>
        )}
      </div>
      <div className="nutrition-macros">
        <MacroTile
          label="P"
          value={totals?.protein_g ?? 0}
          target={targets?.protein_target_g}
          showTarget={hasTargets}
        />
        <MacroTile
          label="C"
          value={totals?.carbs_g ?? 0}
          target={targets?.carbs_target_g}
          showTarget={hasTargets}
        />
        <MacroTile
          label="G"
          value={totals?.fat_g ?? 0}
          target={targets?.fat_target_g}
          showTarget={hasTargets}
        />
      </div>
    </section>
  );
}
