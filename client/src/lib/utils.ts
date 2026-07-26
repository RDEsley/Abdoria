import { getTodaySaoPaulo } from '@shared/utils/timezone';

/** Duração padrão de trabalho e descanso (segundos) quando o exercício não define valores. */
export const WORK_SECONDS = 30;
export const REST_SECONDS = 15;

/** Formata duração acumulada de treino para exibição no dashboard/perfil. */
export function formatTrainingDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} seg`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}

/** Versão compacta de {@link formatTrainingDuration} para grids apertados
    (ex.: cards de resumo semanal) — sem espaços nem "seg"/"min" por extenso. */
export function formatTrainingDurationCompact(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
}

/** Formata segundos no padrão `m:ss` para timers do player. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Chave `YYYY-MM-DD` do dia civil em America/Sao_Paulo — mesmo fuso usado
 * pelo resto do jogo (reset de XP, streak, virada de ranking). Antes usava
 * o fuso local do navegador/dispositivo, o que descolava treinos feitos
 * perto da meia-noite pro dia civil errado nos calendários do Dashboard
 * quando o aparelho não estava no fuso de SP.
 *
 * Só serve pra converter um INSTANTE real (timestamp) — não construa uma
 * data "sintética" via `new Date(y, m, d)` e passe aqui; para aritmética de
 * calendário (somar dias, achar a segunda-feira da semana) use
 * `addDaysSaoPaulo`/`getWeekStartSaoPaulo` de `shared/utils/timezone`.
 */
export function toLocalDateKey(date: Date | string): string {
  return getTodaySaoPaulo(typeof date === 'string' ? new Date(date) : date);
}

/** Início do dia civil local (00:00:00) para comparações de data. */
export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Mantém apenas dígitos (campos numéricos em texto). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Converte string numérica opcional; vazio retorna null. */
export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

/** Converte string decimal opcional (aceita vírgula ou ponto); vazio retorna null. */
export function parseOptionalDecimal(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Máscara de exibição da altura: injeta o ponto decimal (metros) enquanto
 * digita — só funciona porque altura em cm sempre tem no máx. 3 dígitos
 * (100-250), então o ponto sempre entra depois do 1º dígito ("175" -> "1.75").
 * Compartilhada entre Onboarding e a aba Dados do Perfil.
 */
export function formatAlturaMask(digits: string): string {
  if (digits.length === 0) return '';
  if (digits.length === 1) return digits;
  return `${digits[0]}.${digits.slice(1)}`;
}

/**
 * Sanitiza digitação livre de peso (kg): mantém dígitos e no máx. 1 ponto
 * decimal com 1 casa. Ao contrário da altura, o peso não tem largura fixa de
 * dígitos (2 ou 3 dígitos antes da vírgula), então aqui o usuário digita o
 * ponto — não dá pra inferir a posição automaticamente sem quebrar o caso
 * comum de peso inteiro (ex.: "72" viraria "7.2" se a máscara empurrasse o
 * ponto sozinha).
 */
export function sanitizeDecimalInput(value: string, maxDecimals = 1): string {
  const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned.slice(0, 3);
  const intPart = cleaned.slice(0, firstDot).slice(0, 3);
  const decPart = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, maxDecimals);
  return `${intPart}.${decPart}`;
}

export interface ImcFaixa {
  label: string;
  className: string;
}

/** Classificação de IMC (referência OMS) — usada no card de Dados e na Definição. */
export function imcFaixa(imc: number): ImcFaixa {
  if (imc < 18.5) return { label: 'Abaixo do peso', className: 'profile-dados-imc--baixo' };
  if (imc < 25) return { label: 'Peso ideal', className: 'profile-dados-imc--ideal' };
  if (imc < 30) return { label: 'Sobrepeso', className: 'profile-dados-imc--sobrepeso' };
  return { label: 'Obesidade', className: 'profile-dados-imc--alto' };
}

export interface BodyMetricsValidation {
  idade: number | null;
  peso_kg: number | null;
  altura_cm: number | null;
  error: string | null;
}

/** Valida idade, peso e altura quando informados. */
export function validateBodyMetrics(
  idade: string,
  peso: string,
  altura: string,
): BodyMetricsValidation {
  const idadeNum = parseOptionalInt(idade);
  const pesoNum = parseOptionalDecimal(peso);
  const alturaNum = parseOptionalInt(altura);

  if (idadeNum !== null && (idadeNum < 10 || idadeNum > 120)) {
    return {
      idade: idadeNum,
      peso_kg: pesoNum,
      altura_cm: alturaNum,
      error: 'Idade deve estar entre 10 e 120 anos.',
    };
  }
  if (pesoNum !== null && (pesoNum < 20 || pesoNum > 300)) {
    return {
      idade: idadeNum,
      peso_kg: pesoNum,
      altura_cm: alturaNum,
      error: 'Peso deve estar entre 20 e 300 kg.',
    };
  }
  if (alturaNum !== null && (alturaNum < 100 || alturaNum > 250)) {
    return {
      idade: idadeNum,
      peso_kg: pesoNum,
      altura_cm: alturaNum,
      error: 'Altura deve estar entre 100 e 250 cm.',
    };
  }

  return { idade: idadeNum, peso_kg: pesoNum, altura_cm: alturaNum, error: null };
}
