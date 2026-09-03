const WELCOME_ANIMATION_KEY = 'evolyn:welcome-animation-seen';
const JUST_REGISTERED_KEY = 'evolyn:just-registered';

export function hasSeenWelcomeAnimation(): boolean {
  try {
    return localStorage.getItem(WELCOME_ANIMATION_KEY) === '1';
  } catch {
    return true;
  }
}

export function markWelcomeAnimationSeen(): void {
  try {
    localStorage.setItem(WELCOME_ANIMATION_KEY, '1');
  } catch {
    /* storage indisponível — próxima visita pode repetir a cena */
  }
}

export function flagJustRegistered(): void {
  try {
    sessionStorage.setItem(JUST_REGISTERED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasJustRegistered(): boolean {
  try {
    return sessionStorage.getItem(JUST_REGISTERED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Consome a flag de cadastro recém-concluído (uma vez por sessão). */
export function consumeJustRegistered(): boolean {
  try {
    if (sessionStorage.getItem(JUST_REGISTERED_KEY) !== '1') return false;
    sessionStorage.removeItem(JUST_REGISTERED_KEY);
    return true;
  } catch {
    return false;
  }
}
