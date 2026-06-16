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

const NETWORK_HINT =
  'Inicie o projeto com `npm run dev` na raiz (client + server) e acesse http://localhost:5173.';

export function toApiError(error: unknown, status?: number): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
      return new ApiError(
        `Servidor inacessível. ${NETWORK_HINT}`,
        'NETWORK',
      );
    }
    return new ApiError(`Erro de rede: ${error.message}. ${NETWORK_HINT}`, 'NETWORK');
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError('A requisição expirou. Verifique sua conexão e tente novamente.', 'TIMEOUT');
  }

  if (typeof status === 'number') {
    return new ApiError(
      error instanceof Error ? error.message : `Erro HTTP ${status}`,
      'HTTP',
      status,
    );
  }

  return new ApiError(
    error instanceof Error ? error.message : 'Erro desconhecido ao comunicar com a API.',
    'UNKNOWN',
  );
}

export function mapHttpStatus(status: number, serverMessage?: string): ApiError {
  if (serverMessage) {
    return new ApiError(serverMessage, 'HTTP', status);
  }

  const defaults: Record<number, string> = {
    400: 'Dados inválidos. Revise os campos e tente novamente.',
    401: 'Email ou senha incorretos.',
    403: 'Acesso negado.',
    404: 'Recurso não encontrado.',
    409: 'Este email já está cadastrado.',
    422: 'Não foi possível processar os dados enviados.',
    429: 'Muitas tentativas. Aguarde um momento.',
    500: 'Erro interno no servidor. Veja os logs do terminal do server.',
    503: 'Servidor indisponível. O banco de dados pode estar desconectado.',
  };

  return new ApiError(
    defaults[status] ?? `Erro na API (código ${status}).`,
    'HTTP',
    status,
  );
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
