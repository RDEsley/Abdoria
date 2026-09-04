import { useMemo } from 'react';
import { addDaysSaoPaulo, getTodaySaoPaulo } from '@shared/utils/timezone';
import { useApp } from '@/hooks/useApp';

/** Mini gráfico SVG dos últimos 7 dias ativos — perfil / Evolução. */
export function EvolutionSparkline() {
  const { history } = useApp();
  const today = getTodaySaoPaulo();

  const points = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => addDaysSaoPaulo(today, index - 6));
    const active = new Set(
      history.map((row) => {
        const raw = row.concluido_em;
        const iso = typeof raw === 'string' ? raw : raw instanceof Date ? raw.toISOString() : '';
        return iso.slice(0, 10);
      }).filter(Boolean),
    );
    // Prefer active_days semantics via history presence as lightweight proxy when
    // dedicated series isn't on the client payload.
    return days.map((day, index) => ({
      day,
      label: day.slice(8),
      value: active.has(day) ? 1 : 0,
      x: index,
    }));
  }, [history, today]);

  const activeCount = points.filter((point) => point.value > 0).length;
  const width = 280;
  const height = 72;
  const pad = 8;
  const barW = (width - pad * 2) / points.length - 6;

  return (
    <section className="glass-card p-4" aria-label="Evolução dos últimos 7 dias">
      <h3 className="game-section-title">Evolução</h3>
      <p className="mt-1 text-xs font-semibold text-stone-500">
        {activeCount === 0
          ? 'Sem registros nos últimos 7 dias.'
          : `${activeCount} de 7 dias com atividade registrada.`}
      </p>
      <svg
        className="mt-3 w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Gráfico de ${activeCount} dias ativos em 7`}
      >
        {points.map((point) => {
          const x = pad + point.x * ((width - pad * 2) / points.length) + 3;
          const h = point.value ? height - 28 : 8;
          const y = height - 18 - h;
          return (
            <g key={point.day}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={point.value ? '#10b981' : '#e7e5e4'}
              />
              <text
                x={x + barW / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#78716c"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
