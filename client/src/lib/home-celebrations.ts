import type { StreakCelebration } from '@/types';
import { getTodaySaoPaulo } from '@shared/utils/timezone';

export type HomeCelebration =
  | {
      kind: 'frozen';
      id: string;
      /** Sequência protegida — nunca o valor pós-ação-de-hoje. */
      preserved_streak: number;
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
export const HOME_CELEBRATION_QUEUED_EVENT = 'evolyn:home-celebration-queued';

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
  const list = readJson<unknown[]>(PENDING_KEY, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((item): HomeCelebration | null => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Record<string, unknown>;
      if (raw.kind === 'frozen') {
        const preserved = Number(raw.preserved_streak ?? raw.streak_atual ?? 0);
        if (!Number.isFinite(preserved) || typeof raw.id !== 'string') return null;
        return {
          kind: 'frozen',
          id: raw.id,
          preserved_streak: preserved,
          frozen_days: Array.isArray(raw.frozen_days) ? raw.frozen_days.map(String) : [],
        };
      }
      if (raw.kind === 'streak_up') {
        const streakAtual = Number(raw.streak_atual);
        const streakAnterior = Number(raw.streak_anterior);
        if (
          !Number.isFinite(streakAtual) ||
          !Number.isFinite(streakAnterior) ||
          typeof raw.id !== 'string'
        ) {
          return null;
        }
        return {
          kind: 'streak_up',
          id: raw.id,
          streak_atual: streakAtual,
          streak_anterior: streakAnterior,
        };
      }
      return null;
    })
    .filter((item): item is HomeCelebration => item != null);
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOME_CELEBRATION_QUEUED_EVENT));
  }
}

export function queueFrozenHomeCelebration(input: {
  userId?: string | null;
  /** Preferir `preserved_streak`; `streak_atual` permanece por compat. */
  preserved_streak?: number;
  streak_atual?: number;
  frozen_days: string[];
}) {
  const preserved = input.preserved_streak ?? input.streak_atual ?? 0;
  const days = [...input.frozen_days].sort();
  const id = `frozen:${input.userId ?? 'local'}:${days.join(',') || getTodaySaoPaulo()}`;
  upsertPending({
    kind: 'frozen',
    id,
    preserved_streak: preserved,
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
  void import('@/hooks/useLottieAsset').then((m) => m.prewarmLottieAsset('/assets/fire-streak.json'));
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
