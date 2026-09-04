export type NotificationDeniedPlatform = 'native' | 'web';

/** Copy quando permission === denied — não prometer botão inexistente no Web. */
export function notificationDeniedGuidance(platform: NotificationDeniedPlatform): {
  statusLabel: string;
  hint: string;
  actionLabel: string | null;
} {
  if (platform === 'native') {
    return {
      statusLabel: 'Bloqueadas',
      hint: 'Ative nas configurações do sistema para voltar a receber avisos.',
      actionLabel: 'Abrir configurações do sistema',
    };
  }
  return {
    statusLabel: 'Bloqueadas',
    hint: 'Ative as notificações do Evolyn nas permissões do site ou do navegador.',
    actionLabel: null,
  };
}

export function notificationStatusLabel(input: {
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  optOut: boolean;
}): string {
  if (input.optOut) return 'Desativadas';
  if (input.permission === 'granted') return 'Ativas';
  if (input.permission === 'denied') return 'Bloqueadas';
  if (input.permission === 'unsupported') return 'Indisponíveis';
  return 'Aguardando';
}

export function updateCheckButtonLabel(checking: boolean): string {
  return checking ? 'Verificando…' : 'Verificar atualizações';
}

/** Debounce do volume — evita request por pixel do slider. */
export const AUDIO_VOLUME_DEBOUNCE_MS = 650;
