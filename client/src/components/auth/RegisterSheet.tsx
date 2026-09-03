import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuthField } from '@/components/auth/AuthField';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { GameAlertBanner } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRegisterForm,
  validateRegisterIdentity,
  validateRegisterNome,
  type AuthFieldErrors,
} from '@/lib/auth-validation';
import { selectionHaptic, successHaptic } from '@/lib/platform/native-runtime';
import { useAuth } from '@/hooks/useAuth';
import { NOME_MAX_LENGTH } from '@/types';

interface RegisterSheetProps {
  onGoLogin: () => void;
}

export function RegisterSheet({ onGoLogin }: RegisterSheetProps) {
  const { register } = useAuth();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<1 | 2>(1);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const goStep2 = () => {
    const errors = validateRegisterIdentity(nome, email);
    setFieldErrors(errors);
    setSubmitError('');
    if (Object.keys(errors).length > 0) return;
    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step === 1) {
      goStep2();
      return;
    }

    setSubmitError('');
    const errors = validateRegisterForm(nome, email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.nome || errors.email) setStep(1);
      return;
    }

    setLoading(true);
    try {
      void selectionHaptic();
      await register(email, password, nome.trim());
      void successHaptic();
    } catch (err) {
      const message = getErrorMessage(err);
      setSubmitError(message);
      if (/email/i.test(message)) setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const stepTransition = reduceMotion
    ? { duration: 0.12 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <>
      <header className="auth-sheet__heading">
        <p className="auth-sheet__steps" aria-hidden>
          <span className={step >= 1 ? 'is-on' : ''} />
          <span className={step >= 2 ? 'is-on' : ''} />
        </p>
        <h2 id="auth-register-title" className="auth-sheet__title">
          {step === 1 ? 'Vamos começar' : 'Proteja sua conta'}
        </h2>
        <p className="auth-sheet__subtitle">
          {step === 1 ? 'Como podemos te chamar, e onde te encontramos.' : 'Uma senha só sua.'}
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)} className="auth-sheet__form" noValidate>
        <AnimatePresence mode="wait" initial={false}>
          {step === 1 ? (
            <motion.div
              key="step-1"
              className="auth-sheet__step"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={stepTransition}
            >
              <AuthField
                label="Como podemos te chamar?"
                name="nome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  clearFieldError('nome');
                  setSubmitError('');
                }}
                onBlur={() => {
                  const err = validateRegisterNome(nome);
                  setFieldErrors((prev) =>
                    err ? { ...prev, nome: err } : { ...prev, nome: undefined },
                  );
                }}
                error={fieldErrors.nome}
                placeholder="Seu nome"
                autoComplete="name"
                autoCapitalize="words"
                maxLength={NOME_MAX_LENGTH}
              />
              <AuthField
                label="Seu email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                  setSubmitError('');
                }}
                onBlur={() => {
                  const err = validateEmail(email);
                  setFieldErrors((prev) =>
                    err ? { ...prev, email: err } : { ...prev, email: undefined },
                  );
                }}
                error={fieldErrors.email}
                placeholder="seu@email.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              className="auth-sheet__step"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
              transition={stepTransition}
            >
              <AuthField
                label="Senha"
                name="password"
                type="password"
                showPasswordToggle
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                  if (confirmPassword) clearFieldError('confirmPassword');
                  setSubmitError('');
                }}
                onBlur={() => {
                  const err = validatePassword(password);
                  setFieldErrors((prev) =>
                    err ? { ...prev, password: err } : { ...prev, password: undefined },
                  );
                }}
                error={fieldErrors.password}
                extra={<PasswordStrengthMeter value={password} />}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="new-password"
              />
              <AuthField
                label="Confirmar senha"
                name="confirmPassword"
                type="password"
                showPasswordToggle
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError('confirmPassword');
                  setSubmitError('');
                }}
                onBlur={() => {
                  const err = validateConfirmPassword(password, confirmPassword);
                  setFieldErrors((prev) =>
                    err
                      ? { ...prev, confirmPassword: err }
                      : { ...prev, confirmPassword: undefined },
                  );
                }}
                error={fieldErrors.confirmPassword}
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {submitError && (
          <GameAlertBanner
            variant="error"
            title="Não foi possível criar a conta"
            message={submitError}
            live
          />
        )}

        <div className="auth-sheet__actions">
          {step === 2 && (
            <button
              type="button"
              className="auth-sheet__back"
              onClick={() => {
                setSubmitError('');
                setStep(1);
              }}
            >
              Voltar
            </button>
          )}
          <button type="submit" disabled={loading} className="auth-sheet__submit">
            {step === 1 ? 'Continuar' : loading ? 'Criando…' : 'Criar conta'}
          </button>
        </div>
      </form>

      <p className="auth-sheet__switch">
        Já tem uma conta?{' '}
        <button type="button" className="auth-sheet__text-btn" onClick={onGoLogin}>
          Entrar
        </button>
      </p>
    </>
  );
}
