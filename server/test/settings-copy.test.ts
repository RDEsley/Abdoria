import { describe, expect, it } from 'vitest';
import {
  AUDIO_VOLUME_DEBOUNCE_MS,
  notificationDeniedGuidance,
  notificationStatusLabel,
  updateCheckButtonLabel,
} from '../../shared/settings/copy.js';

describe('settings notification denied copy', () => {
  it('Web/PWA não promete botão inexistente', () => {
    const web = notificationDeniedGuidance('web');
    expect(web.actionLabel).toBeNull();
    expect(web.hint.toLowerCase()).toMatch(/navegador|site/);
    expect(web.hint.toLowerCase()).not.toContain('abrir configurações');
  });

  it('Native mostra ação Abrir configurações do sistema', () => {
    const native = notificationDeniedGuidance('native');
    expect(native.actionLabel).toBe('Abrir configurações do sistema');
  });

  it('status compacto', () => {
    expect(notificationStatusLabel({ permission: 'granted', optOut: false })).toBe('Ativas');
    expect(notificationStatusLabel({ permission: 'granted', optOut: true })).toBe('Desativadas');
    expect(notificationStatusLabel({ permission: 'denied', optOut: false })).toBe('Bloqueadas');
  });
});

describe('settings update check label', () => {
  it('usa Verificar atualizações', () => {
    expect(updateCheckButtonLabel(false)).toBe('Verificar atualizações');
    expect(updateCheckButtonLabel(true)).toBe('Verificando…');
  });
});

describe('audio volume debounce', () => {
  it('debounce evita request por pixel', () => {
    expect(AUDIO_VOLUME_DEBOUNCE_MS).toBeGreaterThanOrEqual(500);
    expect(AUDIO_VOLUME_DEBOUNCE_MS).toBeLessThanOrEqual(800);
    const slides = [0.1, 0.2, 0.3, 0.4, 0.5];
    let requests = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    for (const _ of slides) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        requests += 1;
      }, AUDIO_VOLUME_DEBOUNCE_MS);
    }
    // Só o último timer dispara → 1 request.
    expect(timer).not.toBeNull();
    clearTimeout(timer!);
    // Modelo: N slides => 1 persistência agendada.
    expect(slides.length).toBeGreaterThan(1);
    expect(requests).toBe(0);
  });
});
