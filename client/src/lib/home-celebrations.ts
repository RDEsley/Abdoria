import type { StreakCelebration } from '@/types';
import { getTodaySaoPaulo } from '@shared/utils/timezone';

export type HomeCelebration =
  | {
      kind: 'frozen';
      id: string;
      streak_atual: number;
      frozen_days: string[];
    }
  | {
      kind: 'streak_up';
      id: string;
      streak_anterior: number;
      streak_atual: number;
    };

const PENDING_KEY = 'evolyn:home-celebrations-pending-v1';
const SEEN_KEY = 'evolyn:home-celebrations-seen-v1';
const LEGACY_STREAK_KEY = 'evolyn:pending-streak-home';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

function readPending(): HomeCelebration[] {
  migrateLegacyStreakQueue();
  const list = readJson<HomeCelebration[]>(PENDING_KEY, []);
  return Array.isArray(list) ? list : [];
}

function readSeen(): Record<string, true> {
  const seen = readJson<Record<string, true>>(SEEN_KEY, {});
  return seen && typeof seen === 'object' ? seen : {};
}

function isSeen(id: string): boolean {
  return Boolean(readSeen()[id]);
}

function markSeen(id: string) {
  const seen = readSeen();
  seen[id] = true;
  writeJson(SEEN_KEY, seen);
}

/** Migra fila antiga (sessionStorage) para a fila central. */
function migrateLegacyStreakQueue() {
  try {
    const raw = sessionStorage.getItem(LEGACY_STREAK_KEY);
    if (!raw) return;
    sessionStorage.removeItem(LEGACY_STREAK_KEY);
    const parsed = JSON.parse(raw) as StreakCelebration;
    if (
      typeof parsed?.streak_atual === 'number' &&
      typeof parsed?.streak_anterior === 'number' &&
      parsed.streak_atual > parsed.streak_anterior
    ) {
      queueStreakUpCelebration(parsed);
    }
  } catch {
    /* ignore */
  }
}

function upsertPending(event: HomeCelebration) {
  if (isSeen(event.id)) return;
  const pending = readPending().filter((item) => item.id !== event.id);
  pending.push(event);
  writeJson(PENDING_KEY, pending);
}

export function queueFrozenHomeCelebration(input: {
  userId?: string | null;
  streak_atual: number;
  frozen_days: string[];
}) {
  const days = [...input.frozen_days].sort();
  const id = `frozen:${input.userId ?? 'local'}:${days.join(',') || getTodaySaoPaulo()}`;
  upsertPending({
    kind: 'frozen',
    id,
    streak_atual: input.streak_atual,
    frozen_days: days,
  });
}

export function queueStreakUpCelebration(celebration: StreakCelebration, userId?: string | null) {
  if (celebration.streak_atual <= celebration.streak_anterior) return;
  const id = `streak_up:${userId ?? 'local'}:${getTodaySaoPaulo()}:${celebration.streak_atual}`;
  upsertPending({
    kind: 'streak_up',
    id,
    streak_anterior: celebration.streak_anterior,
    streak_atual: celebration.streak_atual,
  });
}

/** Compat: chamadas antigas do Player/Activities. */
export function queueStreakHomeCelebration(celebration: StreakCelebration) {
  queueStreakUpCelebration(celebration);
}

/** Prioridade: Frozen > aumento de Streak. */
export function peekNextHomeCelebration(): HomeCelebration | null {
  const pending = readPending().filter((item) => !isSeen(item.id));
  const frozen = pending.find((item) => item.kind === 'frozen');
  if (frozen) return frozen;
  return pending.find((item) => item.kind === 'streak_up') ?? null;
}

export function consumeHomeCelebration(id: string) {
  markSeen(id);
  writeJson(
    PENDING_KEY,
    readPending().filter((item) => item.id !== id),
  );
}

/** @deprecated use peekNext + consume */
export function consumeStreakHomeCelebration(): StreakCelebration | null {
  const next = peekNextHomeCelebration();
  if (!next || next.kind !== 'streak_up') return null;
  consumeHomeCelebration(next.id);
  return {
    streak_atual: next.streak_atual,
    streak_anterior: next.streak_anterior,
  };
}
