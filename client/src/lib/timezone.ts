/** Data civil `YYYY-MM-DD` em America/Sao_Paulo (mesmo critério do servidor). */
export function getTodaySaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
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
