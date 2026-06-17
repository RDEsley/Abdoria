/** Duração padrão de trabalho e descanso (segundos) quando o exercício não define valores. */
export const WORK_SECONDS = 30;
export const REST_SECONDS = 15;

/** Formata duração acumulada de treino para exibição no dashboard/perfil. */
export function formatTrainingDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} seg`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

/** Formata segundos no padrão `m:ss` para timers do player. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Chave `YYYY-MM-DD` no fuso local do navegador (calendário de atividade). */
export function toLocalDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Início do dia civil local (00:00:00) para comparações de data. */
export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Mantém apenas dígitos (campos numéricos em texto). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Converte string numérica opcional; vazio retorna null. */
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

export interface BodyMetricsValidation {
  idade: number | null;
  peso_kg: number | null;
  altura_cm: number | null;
  error: string | null;
}

/** Valida idade, peso e altura quando informados. */
export function validateBodyMetrics(idade: string, peso: string, altura: string): BodyMetricsValidation {
  const idadeNum = parseOptionalInt(idade);
  const pesoNum = parseOptionalInt(peso);
  const alturaNum = parseOptionalInt(altura);

  if (idadeNum !== null && (idadeNum < 10 || idadeNum > 120)) {
    return { idade: idadeNum, peso_kg: pesoNum, altura_cm: alturaNum, error: 'Idade deve estar entre 10 e 120 anos.' };
  }
  if (pesoNum !== null && (pesoNum < 20 || pesoNum > 300)) {
    return { idade: idadeNum, peso_kg: pesoNum, altura_cm: alturaNum, error: 'Peso deve estar entre 20 e 300 kg.' };
  }
  if (alturaNum !== null && (alturaNum < 100 || alturaNum > 250)) {
    return { idade: idadeNum, peso_kg: pesoNum, altura_cm: alturaNum, error: 'Altura deve estar entre 100 e 250 cm.' };
  }

  return { idade: idadeNum, peso_kg: pesoNum, altura_cm: alturaNum, error: null };
}
