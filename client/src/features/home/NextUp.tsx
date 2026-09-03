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
      className={`activity-quick-card${compact ? ' activity-quick-card--done' : ''}`}
    >
      <span className="activity-quick-card__check">
        <Icon size={18} />
      </span>
      <div className="activity-quick-card__body">
        {item.eyebrow && (
          <small className="uppercase tracking-wide text-stone-400">{item.eyebrow}</small>
        )}
        <strong>{item.title}</strong>
        {item.subtitle && (
          <span className="text-xs font-semibold text-stone-500">{item.subtitle}</span>
        )}
      </div>
      {!compact && item.cta ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-emerald-700">
          {item.cta}
          <ChevronRight size={14} />
        </span>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-stone-400" />
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
