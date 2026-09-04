/** localStorage: swipe hint já foi visto / primeiro swipe bem-sucedido. */
export const ACTIVITY_SWIPE_HINT_KEY = 'evolyn:activity-swipe-hint-done';

export function markActivitySwipeHintDone(): void {
  try {
    localStorage.setItem(ACTIVITY_SWIPE_HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function shouldPlayActivitySwipeHint(): boolean {
  try {
    return localStorage.getItem(ACTIVITY_SWIPE_HINT_KEY) !== '1';
  } catch {
    return false;
  }
}
