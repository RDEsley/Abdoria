import { getSaoPauloWeekday } from '../utils/timezone.js';
import { consistencyLast30Days, type ConsistencyLog } from './consistency.js';

export type InsightConfidence = 'low' | 'medium' | 'high';

export interface EvolynInsight {
  id: string;
  title: string;
  body: string;
  confidence: InsightConfidence;
}

interface InsightInput {
  todayKey: string;
  activities: Array<{ id: string; name: string }>;
  logs: Array<
    ConsistencyLog & {
      completed_at?: string;
      duration_min?: number | null;
      value?: number | null;
      metrics?: Record<string, unknown>;
    }
  >;
  activeDayKeys: string[];
}

function hourFromIso(iso?: string): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return date.getHours();
}

export function buildDeterministicInsights(input: InsightInput): EvolynInsight[] {
  const insights: EvolynInsight[] = [];
  const logs30 = input.logs.filter((log) => log.day_key <= input.todayKey);

  for (const activity of input.activities) {
    const consistency = consistencyLast30Days(activity.id, logs30, input.todayKey, 7);
    if (consistency.days_done >= 6) {
      insights.push({
        id: `consistencia_7_${activity.id}`,
        title: `${activity.name} ${consistency.days_done} de 7 dias`,
        body: `Você manteve ${activity.name.toLowerCase()} em ${consistency.days_done} dos últimos 7 dias.`,
        confidence: 'high',
      });
    }
  }

  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const key of input.activeDayKeys) {
    weekdayCounts[getSaoPauloWeekday(new Date(`${key}T15:00:00.000Z`))] += 1;
  }
  const bestWeekday = weekdayCounts.indexOf(Math.max(...weekdayCounts));
  const labels = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  if (Math.max(...weekdayCounts) >= 4) {
    insights.push({
      id: 'melhor_dia_semana',
      title: `${labels[bestWeekday][0]?.toUpperCase()}${labels[bestWeekday].slice(1)} é o seu dia mais consistente`,
      body: 'É o dia em que você mais registra uma ação válida. Sem causa — só o padrão.',
      confidence: 'medium',
    });
  }

  const walkLogs = logs30.filter((log) => {
    const km = Number(log.metrics?.distancia_km ?? log.value ?? 0);
    return Number.isFinite(km) && km > 0;
  });
  const walkKm = walkLogs.reduce(
    (sum, log) => sum + Number(log.metrics?.distancia_km ?? log.value ?? 0),
    0,
  );
  if (walkKm >= 10) {
    insights.push({
      id: 'km_semana',
      title: `Você caminhou ${walkKm.toFixed(0)} km no período`,
      body: 'Soma das distâncias que você registrou nas atividades.',
      confidence: walkLogs.length >= 3 ? 'high' : 'low',
    });
  }

  const studyHours = new Map<string, number>();
  for (const log of logs30) {
    const hour = hourFromIso(log.completed_at);
    if (hour == null) continue;
    const bucket = hour < 12 ? 'manhã' : hour < 18 ? 'tarde' : hour < 21 ? '18–21h' : 'noite';
    studyHours.set(bucket, (studyHours.get(bucket) ?? 0) + 1);
  }
  const bestBucket = [...studyHours.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestBucket && bestBucket[1] >= 4) {
    insights.push({
      id: 'melhor_horario',
      title: `Melhor horário observado: ${bestBucket[0]}`,
      body: 'É quando você mais conclui atividades. Use se fizer sentido — não é regra.',
      confidence: 'medium',
    });
  }

  return insights.filter((insight) => insight.confidence !== 'low').slice(0, 6);
}
