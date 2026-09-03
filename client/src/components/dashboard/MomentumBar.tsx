import { Sun, Cloud, Moon } from 'lucide-react';

interface MomentumPeriod {
  planned: number;
  done: number;
}

interface Props {
  currentPeriod: 'manha' | 'tarde' | 'noite';
  periods: {
    manha: MomentumPeriod;
    tarde: MomentumPeriod;
    noite: MomentumPeriod;
  };
}

const PERIOD_CONFIG = {
  manha: { label: 'Manhã', Icon: Sun, accent: 'var(--accent-streak)' },
  tarde: { label: 'Tarde', Icon: Cloud, accent: 'var(--accent-xp)' },
  noite: { label: 'Noite', Icon: Moon, accent: 'var(--accent-rotina)' },
} as const;

export function MomentumBar({ currentPeriod, periods }: Props) {
  const keys = ['manha', 'tarde', 'noite'] as const;
  const totalPlanned = keys.reduce((s, k) => s + periods[k].planned, 0);
  if (totalPlanned === 0) return null;

  return (
    <div className="flex gap-2">
      {keys.map((key) => {
        const { label, Icon, accent } = PERIOD_CONFIG[key];
        const { planned, done } = periods[key];
        const isCurrent = key === currentPeriod;
        const complete = planned > 0 && done >= planned;
        const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;

        return (
          <div
            key={key}
            className={`flex-1 rounded-xl border p-2 text-center transition-all ${
              isCurrent ? 'border-current shadow-sm' : 'border-stone-200'
            } ${complete ? 'bg-emerald-50' : ''}`}
            style={{ borderColor: isCurrent ? accent : undefined }}
          >
            <Icon
              size={16}
              className="mx-auto"
              style={{ color: complete ? 'var(--accent-treino)' : isCurrent ? accent : '#a8a29e' }}
            />
            <p className="mt-0.5 text-[0.6rem] font-extrabold text-stone-600">{label}</p>
            {planned > 0 && (
              <>
                <div className="mx-auto mt-1 h-1 w-full max-w-[3rem] overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: complete ? 'var(--accent-treino)' : accent,
                    }}
                  />
                </div>
                <p className="mt-0.5 text-[0.55rem] font-bold text-stone-500">
                  {done}/{planned}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
