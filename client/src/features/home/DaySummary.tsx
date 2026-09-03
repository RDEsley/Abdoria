export function DaySummary({
  diaAtivo,
  streak,
  xpHoje,
}: {
  diaAtivo: boolean;
  streak: number;
  xpHoje: number;
}) {
  return (
    <section className="glass-card p-4">
      <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-emerald-700">
        {diaAtivo ? 'Sequência garantida hoje' : 'Ainda dá tempo'}
      </p>
      <h2 className="mt-1 text-lg font-extrabold text-stone-800">
        {diaAtivo ? 'Você já plantou o dia.' : 'Faça uma pequena coisa por você hoje.'}
      </h2>
      <p className="mt-1 text-xs font-bold text-stone-500">
        Sequência {streak}d · {xpHoje} XP hoje
      </p>
    </section>
  );
}
