/** Data civil `YYYY-MM-DD` no fuso America/Sao_Paulo (reset de XP diário). */
export function getTodaySaoPaulo(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Soma dias civis em SP a partir de uma chave `YYYY-MM-DD`. */
export function addDaysSaoPaulo(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + delta);
  const yy = anchor.getUTCFullYear();
  const mm = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Hora local (0–23) em America/Sao_Paulo — usada na conquista Madrugador. */
export function getHourSaoPaulo(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  if (hour === 24) hour = 0;
  return hour;
}

/** Dia da semana (0=Dom … 6=Sáb) em America/Sao_Paulo. */
export function getSaoPauloWeekday(date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function isSameDaySaoPaulo(a: Date, b: Date): boolean {
  return getTodaySaoPaulo(a) === getTodaySaoPaulo(b);
}

/** `YYYY-MM-DD` da segunda-feira da semana civil em SP que contém `date`. */
export function getWeekStartSaoPaulo(date = new Date()): string {
  const today = getTodaySaoPaulo(date);
  const [y, m, d] = today.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = getSaoPauloWeekday(anchor);
  const diff = weekday === 0 ? -6 : 1 - weekday;
  anchor.setUTCDate(anchor.getUTCDate() + diff);
  const yy = anchor.getUTCFullYear();
  const mm = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(anchor.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Instante UTC do início do dia civil em SP (para queries Postgres). */
export function startOfDaySaoPaulo(date = new Date()): Date {
  const target = getTodaySaoPaulo(date);
  let probe = date.getTime() - 36 * 3_600_000;
  for (let i = 0; i < 72; i += 1) {
    const candidate = new Date(probe);
    if (getTodaySaoPaulo(candidate) === target) {
      const hour = getHourSaoPaulo(candidate);
      const minute = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Sao_Paulo',
          minute: 'numeric',
        }).formatToParts(candidate).find((p) => p.type === 'minute')?.value ?? 0,
      );
      const second = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Sao_Paulo',
          second: 'numeric',
        }).formatToParts(candidate).find((p) => p.type === 'second')?.value ?? 0,
      );
      if (hour === 0 && minute === 0 && second === 0) return candidate;
    }
    probe += 3_600_000;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDaySaoPaulo(date = new Date()): Date {
  const start = startOfDaySaoPaulo(date);
  return new Date(start.getTime() + 86_400_000);
}

/** Segundos até a próxima meia-noite em America/Sao_Paulo. */
export function secondsUntilSaoPauloMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now);

  let hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  if (hour === 24) hour = 0;

  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const second = Number(parts.find((part) => part.type === 'second')?.value ?? 0);
  const elapsed = hour * 3600 + minute * 60 + second;

  return Math.max(0, 86400 - elapsed);
}

/** Formata segundos restantes para exibição compacta (ex.: `5h 12m` ou `08:45`). */
export function formatCountdown(seconds: number): string {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/** Partes do countdown até o próximo domingo 00:00 (America/Sao_Paulo) — reset semanal do ranking. */
export function leaderboardResetCountdownParts(now = new Date()): {
  days: number;
  hours: number;
  minutes: number;
  totalSeconds: number;
} {
  const weekday = getSaoPauloWeekday(now);
  let daysUntilSunday = (7 - weekday) % 7;
  if (daysUntilSunday === 0) daysUntilSunday = 7;

  const secondsToMidnight = secondsUntilSaoPauloMidnight(now);
  const totalSeconds = (daysUntilSunday - 1) * 86_400 + secondsToMidnight;

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    totalSeconds,
  };
}
