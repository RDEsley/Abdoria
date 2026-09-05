export function NutritionSkeleton() {
  return (
    <div className="nutrition-skeleton" aria-busy="true" aria-label="Carregando alimentação">
      <div className="nutrition-skeleton__block nutrition-skeleton__block--hero" />
      <div className="nutrition-skeleton__row">
        <div className="nutrition-skeleton__block" />
        <div className="nutrition-skeleton__block" />
        <div className="nutrition-skeleton__block" />
      </div>
      <div className="nutrition-skeleton__block nutrition-skeleton__block--card" />
      <div className="nutrition-skeleton__block nutrition-skeleton__block--card" />
      <div className="nutrition-skeleton__block nutrition-skeleton__block--card" />
    </div>
  );
}
