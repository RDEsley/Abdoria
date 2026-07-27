const ABSTRACT_EMAIL_API_KEY = process.env.ABSTRACT_EMAIL_API_KEY;
const ABSTRACT_EMAIL_API_URL = 'https://emailvalidation.abstractapi.com/v1/';

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AbstractEmailValidationResponse {
  deliverability?: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY' | 'UNKNOWN';
  is_valid_format?: { value?: boolean };
  is_disposable_email?: { value?: boolean };
}

export interface EmailVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Confirma que o email é real/entregável antes do cadastro, sem enviar nada
 * (consulta a AbstractAPI). Falha aberta: sem chave configurada, timeout ou
 * erro da API, deixa passar — instabilidade de terceiro não pode travar
 * cadastro. Só bloqueia em casos claros (formato inválido, não-entregável
 * confirmado, ou descartável); "RISKY"/"UNKNOWN" passam, pra não recusar
 * gente real por falso positivo.
 */
export async function verifyEmailIsReal(email: string): Promise<EmailVerificationResult> {
  if (!EMAIL_FORMAT_REGEX.test(email)) {
    return { valid: false, reason: 'Formato de email inválido.' };
  }

  if (!ABSTRACT_EMAIL_API_KEY) return { valid: true };

  try {
    const url = `${ABSTRACT_EMAIL_API_URL}?api_key=${ABSTRACT_EMAIL_API_KEY}&email=${encodeURIComponent(email)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { valid: true };

    const data = (await response.json()) as AbstractEmailValidationResponse;

    if (data.is_valid_format?.value === false) {
      return { valid: false, reason: 'Formato de email inválido.' };
    }
    if (data.deliverability === 'UNDELIVERABLE') {
      return { valid: false, reason: 'Não conseguimos confirmar que esse email existe.' };
    }
    if (data.is_disposable_email?.value === true) {
      return { valid: false, reason: 'Emails temporários/descartáveis não são aceitos.' };
    }

    return { valid: true };
  } catch (error) {
    console.error('verifyEmailIsReal error:', error);
    return { valid: true };
  }
}
