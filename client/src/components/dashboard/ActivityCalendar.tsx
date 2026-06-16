import { useEffect, useMemo } from 'react';
import { ActivityCalendar as ReactActivityCalendar, type Activity } from 'react-activity-calendar';
import { useApp } from '@/hooks/useApp';
import { toLocalDateKey } from '@/lib/utils';

export function ActivityCalendar() {
  const { history, ensureHistory, historyLoading } = useApp();

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const { data, maxLevel } = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of history) {
      const date = toLocalDateKey(entry.concluido_em);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }

    const data: Activity[] = [...counts.entries()].map(([date, count]) => ({
      date,
      count,
      level: Math.min(count, 4) as 0 | 1 | 2 | 3 | 4,
    }));

    const maxLevel = Math.max(4, ...data.map((d) => d.level));

    return { data, maxLevel };
  }, [history]);

  if (historyLoading) {
    return <p className="text-sm text-stone-500">Carregando calendário...</p>;
  }

  if (data.length === 0) {
    return <p className="text-sm text-stone-500">Nenhum treino registrado ainda. Comece hoje!</p>;
  }

  return (
    <div className="overflow-x-auto">
      <ReactActivityCalendar
        data={data}
        maxLevel={maxLevel}
        theme={{
          light: ['#e7e5e4', '#bbf7d0', '#86efac', '#34d399', '#059669'],
          dark: ['#e7e5e4', '#bbf7d0', '#86efac', '#34d399', '#059669'],
        }}
        colorScheme="light"
        blockSize={12}
        blockMargin={3}
        fontSize={12}
        labels={{
          totalCount: '{{count}} treinos em {{year}}',
        }}
      />
    </div>
  );
}
