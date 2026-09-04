import { Link } from 'react-router-dom';
import {
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Moon,
  NotebookPen,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { DayGuideEntry, DaySnapshot } from '@/lib/api/day';

const KIND_ICON: Record<DayGuideEntry['kind'], LucideIcon> = {
  workout: Dumbbell,
  activity: ClipboardList,
  routine: CalendarCheck2,
  quest: Sparkles,
  review: NotebookPen,
  rest: Moon,
};

function GuideCard({ item, compact }: { item: DayGuideEntry; compact?: boolean }) {
  const Icon = KIND_ICON[item.kind] ?? ClipboardList;
  return (
    <Link
      to={item.href}
      className={`next-up-card${compact ? ' next-up-card--compact' : ''}`}
    >
      <span className="next-up-card__icon" aria-hidden>
        <Icon size={18} />
      </span>
      <div className="next-up-card__body">
        {item.eyebrow ? <small className="next-up-card__eyebrow">{item.eyebrow}</small> : null}
        <strong className="next-up-card__title">{item.title}</strong>
        {item.subtitle ? <span className="next-up-card__subtitle">{item.subtitle}</span> : null}
      </div>
      {!compact && item.cta ? (
        <span className="next-up-card__cta">
          {item.cta}
          <ChevronRight size={14} aria-hidden />
        </span>
      ) : (
        <ChevronRight size={16} className="next-up-card__chevron" aria-hidden />
      )}
    </Link>
  );
}

export function NextUp({ items }: { items: DaySnapshot['next_up'] }) {
  const [primary, secondary] = items;
  if (!primary) {
    return <p className="text-sm font-bold text-stone-500">Nada pendente — o dia está em ordem.</p>;
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className="game-section-title">A seguir</h3>
      <GuideCard item={primary} />
      {secondary && <GuideCard item={secondary} compact />}
    </section>
  );
}
