/** Data civil `YYYY-MM-DD` no fuso America/Sao_Paulo (reset de XP diário). */
export function getTodaySaoPaulo(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Hora local (0–23) em America/Sao_Paulo — usada na conquista Madrugador. */
export function getHourSaoPaulo(date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
}
