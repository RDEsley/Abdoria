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
function saoPauloOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const representedAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  const instantWithoutMs = Math.floor(instant.getTime() / 1000) * 1000;
  return representedAsUtc - instantWithoutMs;
}

function startOfSaoPauloDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);

  // Duas passagens cobrem mudanças históricas de offset sem depender do fuso
  // do processo. A busca antiga preservava minutos/segundos, quase nunca
  // encontrava 00:00:00 e caía num fallback UTC incorreto após 21h em SP.
  let result = utcMidnight - saoPauloOffsetMs(new Date(utcMidnight));
  result = utcMidnight - saoPauloOffsetMs(new Date(result));
  return new Date(result);
}

export function startOfDaySaoPaulo(date = new Date()): Date {
  return startOfSaoPauloDayKey(getTodaySaoPaulo(date));
}

export function endOfDaySaoPaulo(date = new Date()): Date {
  return startOfSaoPauloDayKey(addDaysSaoPaulo(getTodaySaoPaulo(date), 1));
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
