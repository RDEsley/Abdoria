export type AuthFieldKey = 'nome' | 'email' | 'password' | 'confirmPassword';

export type AuthFieldErrors = Partial<Record<AuthFieldKey, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Informe seu email.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Email inválido. Confira o endereço e tente de novo.';
  return undefined;
}

export function validatePassword(value: string, minLength = 6): string | undefined {
  if (!value) return 'Informe sua senha.';
  if (value.length < minLength) return `A senha precisa ter pelo menos ${minLength} caracteres.`;
  return undefined;
}

export function validateRegisterNome(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Informe como quer ser chamado no jogo.';
  if (trimmed.length < 2) return 'O nome precisa ter pelo menos 2 caracteres.';
  if (trimmed.length > 40) return 'Use um nome com até 40 caracteres.';
  return undefined;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) return 'Confirme sua senha.';
  if (password !== confirmPassword) return 'As senhas não coincidem.';
  return undefined;
}

export function validateRegisterForm(
  nome: string,
  email: string,
  password: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const nomeError = validateRegisterNome(nome);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const confirmError = validateConfirmPassword(password, confirmPassword);

  if (nomeError) errors.nome = nomeError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  if (confirmError) errors.confirmPassword = confirmError;

  return errors;
}

export function validateLoginForm(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password, 1);

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;

  return errors;
}
