import { useEffect, useMemo, useState } from 'react';
import { getHourSaoPaulo } from '@shared/utils/timezone';

type DaySummaryTone = 'morning' | 'pending' | 'risk' | 'secured';

function resolveTone(diaAtivo: boolean, hour: number): DaySummaryTone {
  if (diaAtivo) return 'secured';
  if (hour >= 19) return 'risk';
  if (hour < 12) return 'morning';
  return 'pending';
}

const COPY: Record<DaySummaryTone, { kicker: string; title: string; hint: string }> = {
  morning: {
    kicker: 'Bom dia',
    title: 'Um pequeno passo já planta o dia.',
    hint: 'Quando fizer sentido, registre algo — sem pressa.',
  },
  pending: {
    kicker: 'Ainda dá tempo',
    title: 'Faça uma pequena coisa por você hoje.',
    hint: 'Treino, atividade ou rotina — qualquer ação válida conta.',
  },
  risk: {
    kicker: 'Quase virando o dia',
    title: 'Ainda dá pra garantir sua sequência.',
    hint: 'Uma ação válida hoje mantém o ritmo. Frozen protege se você tiver.',
  },
  secured: {
    kicker: 'Dia ativo garantido',
    title: 'Você já plantou o dia.',
    hint: 'Pode seguir no seu ritmo — a sequência está segura.',
  },
};

export function DaySummary({
  diaAtivo,
  streak,
  xpHoje,
}: {
  diaAtivo: boolean;
  streak: number;
  xpHoje: number;
}) {
  const [hour, setHour] = useState(() => getHourSaoPaulo());
  useEffect(() => {
    const tick = () => setHour(getHourSaoPaulo());
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const tone = useMemo(() => resolveTone(diaAtivo, hour), [diaAtivo, hour]);
  const copy = COPY[tone];

  return (
    <section className={`day-summary day-summary--${tone}`}>
      <p className="day-summary__kicker">{copy.kicker}</p>
      <h2 className="day-summary__title">{copy.title}</h2>
      <p className="day-summary__meta">
        Sequência {streak} · {xpHoje} XP hoje
      </p>
      <p className="day-summary__hint">{copy.hint}</p>
    </section>
  );
}
