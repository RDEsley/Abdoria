import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { DaySnapshot } from '@/lib/api/day';

export function NextUp({ items }: { items: DaySnapshot['next_up'] }) {
  if (items.length === 0) {
    return <p className="text-sm font-bold text-stone-500">Nada pendente — o dia está em ordem.</p>;
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className="game-section-title">A seguir</h3>
      {items.map((item) => (
        <Link key={`${item.kind}-${item.href}`} to={item.href} className="activity-quick-card">
          <div className="activity-quick-card__body">
            <small className="uppercase tracking-wide text-stone-400">
              {item.kind === 'workout'
                ? 'Treino'
                : item.kind === 'routine'
                  ? 'Rotina'
                  : 'Atividade'}
            </small>
            <strong>{item.title}</strong>
          </div>
          <ChevronRight size={16} />
        </Link>
      ))}
    </section>
  );
}
