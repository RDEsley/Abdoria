const GIFT_CODE_MIN_LENGTH = 3;
const GIFT_CODE_MAX_LENGTH = 32;
const GIFT_CODE_PATTERN = /^[a-z0-9_-]+$/;

export function normalizeGiftCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidGiftCodeFormat(code: string): boolean {
  if (!code) return false;
  if (code.length < GIFT_CODE_MIN_LENGTH || code.length > GIFT_CODE_MAX_LENGTH) return false;
  return GIFT_CODE_PATTERN.test(code);
}

export function giftCodeFormatError(): string {
  return `Código inválido. Use entre ${GIFT_CODE_MIN_LENGTH} e ${GIFT_CODE_MAX_LENGTH} caracteres (letras, números, _ ou -).`;
}
