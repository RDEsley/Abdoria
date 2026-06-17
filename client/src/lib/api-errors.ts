export type ApiErrorCode = 'NETWORK' | 'TIMEOUT' | 'HTTP' | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;

  constructor(message: string, code: ApiErrorCode, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Banner na tela de login quando o app não alcança o servidor. */
export const OFFLINE_BANNER =
  'Não conseguimos conectar agora. Verifique sua internet e tente de novo em instantes.';

/** Banner quando o servidor responde, mas os dados não carregam. */
export const DATABASE_BANNER =
  'Estamos com dificuldade para carregar seus dados. Tente novamente em alguns minutos.';

const NETWORK_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
const TIMEOUT_MESSAGE = 'A conexão demorou demais. Tente novamente.';
const GENERIC_MESSAGE = 'Algo deu errado. Tente novamente em instantes.';

const TECHNICAL_PATTERN =
  /npm run dev|localhost|127\.0\.0\.1|mongodb|\.env|atlas|api offline|erro http|failed to fetch|networkerror|syntaxerror|typeerror|uncaught|stack trace|\/api\//i;

const SERVER_MESSAGE_MAP: Record<string, string> = {
  'Slot inválido (0, 1 ou 2).': 'Oferta inválida.',
  'Tipo inválido. Use avatar ou borda.': 'Tipo de item inválido.',
  'Informe o id do item.': 'Selecione um item para continuar.',
  'Informe tipo e id do item.': 'Selecione um item para continuar.',
  'Credenciais inválidas.': 'Email ou senha incorretos.',
  'Token inválido ou expirado.': 'Sua sessão expirou. Faça login novamente.',
  'Autenticação necessária.': 'Faça login para continuar.',
};

const HTTP_DEFAULTS: Record<number, string> = {
  400: 'Revise os dados e tente novamente.',
  401: 'Email ou senha incorretos.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você pediu.',
  409: 'Este email já está cadastrado.',
  422: 'Não foi possível processar os dados enviados.',
  429: 'Muitas tentativas seguidas. Aguarde um momento e tente de novo.',
  500: 'Não foi possível concluir agora. Tente novamente em instantes.',
  503: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
};

function isTechnicalMessage(message: string): boolean {
  return TECHNICAL_PATTERN.test(message);
}

function polishServerMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return GENERIC_MESSAGE;
  if (SERVER_MESSAGE_MAP[trimmed]) return SERVER_MESSAGE_MAP[trimmed];
  if (isTechnicalMessage(trimmed)) return GENERIC_MESSAGE;
  if (trimmed.length > 160) return GENERIC_MESSAGE;
  return trimmed;
}

export function toApiError(error: unknown, status?: number): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
      return new ApiError(NETWORK_MESSAGE, 'NETWORK');
    }
    return new ApiError(NETWORK_MESSAGE, 'NETWORK');
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError(TIMEOUT_MESSAGE, 'TIMEOUT');
  }

  if (typeof status === 'number') {
    const raw = error instanceof Error ? error.message : '';
    const message = raw ? polishServerMessage(raw) : (HTTP_DEFAULTS[status] ?? GENERIC_MESSAGE);
    return new ApiError(message, 'HTTP', status);
  }

  if (error instanceof Error && error.message) {
    return new ApiError(polishServerMessage(error.message), 'UNKNOWN');
  }

  return new ApiError(GENERIC_MESSAGE, 'UNKNOWN');
}

export function mapHttpStatus(status: number, serverMessage?: string): ApiError {
  if (serverMessage) {
    return new ApiError(polishServerMessage(serverMessage), 'HTTP', status);
  }

  return new ApiError(HTTP_DEFAULTS[status] ?? GENERIC_MESSAGE, 'HTTP', status);
}

/** Mensagem segura para exibir na interface — nunca mostra detalhes técnicos. */
export function getErrorMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (error instanceof ApiError) return error.message;
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed) return fallback;
    return isTechnicalMessage(trimmed) ? fallback : trimmed;
  }
  try {
    return toApiError(error).message;
  } catch {
    return fallback;
  }
}
