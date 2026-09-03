import { useEffect, useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { GameAlertBanner } from '@/components/ui/GameToast';
import { getHealth } from '@/lib/api';
import {
  DATABASE_BANNER,
  getErrorMessage,
  isLoginCredentialsError,
  OFFLINE_BANNER,
} from '@/lib/api-errors';
import { getSavedEmail } from '@/lib/auth-storage';
import {
  validateEmail,
  validateLoginForm,
  validatePassword,
  type AuthFieldErrors,
} from '@/lib/auth-validation';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { useAuth } from '@/hooks/useAuth';

interface LoginSheetProps {
  onGoRegister: () => void;
}

export function LoginSheet({ onGoRegister }: LoginSheetProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState(() => getSavedEmail() ?? '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = getSavedEmail();
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    void getHealth()
      .then((health) => {
        setApiOnline(true);
        setDbOnline(health.database === 'connected');
      })
      .catch(() => {
        setApiOnline(false);
        setDbOnline(null);
      });
  }, []);

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearSubmitFeedback = () => {
    setSubmitError('');
    setCredentialsInvalid(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearSubmitFeedback();

    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      void selectionHaptic();
      await login(email, password);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setCredentialsInvalid(isLoginCredentialsError(err));
    } finally {
      setLoading(false);
    }
  };

  const showSystemAlert = apiOnline === false || (apiOnline === true && dbOnline === false);

  return (
    <>
      <header className="auth-sheet__heading">
        <h2 id="auth-login-title" className="auth-sheet__title">
          Que bom ter você de volta
        </h2>
        <p className="auth-sheet__subtitle">Entre para continuar plantando a sua evolução.</p>
      </header>

      {showSystemAlert && (
        <div className="game-toast-banners">
          {apiOnline === false && (
            <GameAlertBanner variant="warn" title="Sem conexão" message={OFFLINE_BANNER} />
          )}
          {apiOnline === true && dbOnline === false && (
            <GameAlertBanner variant="warn" title="Dados indisponíveis" message={DATABASE_BANNER} />
          )}
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="auth-sheet__form" noValidate>
        <AuthField
          label="Email"
          name="email"
          type="email"
          value={email}
          highlight={credentialsInvalid}
          aria-describedby={credentialsInvalid && submitError ? 'login-submit-error' : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError('email');
            clearSubmitFeedback();
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
        <AuthField
          label="Senha"
          name="password"
          type="password"
          showPasswordToggle
          value={password}
          highlight={credentialsInvalid}
          aria-describedby={credentialsInvalid && submitError ? 'login-submit-error' : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError('password');
            clearSubmitFeedback();
          }}
          onBlur={() => {
            const err = validatePassword(password, 1);
            setFieldErrors((prev) =>
              err ? { ...prev, password: err } : { ...prev, password: undefined },
            );
          }}
          error={fieldErrors.password}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="auth-sheet__extras">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="auth-sheet__text-btn"
          >
            Esqueci minha senha
          </button>
        </div>

        <button type="submit" disabled={loading} className="auth-sheet__submit">
          {loading ? 'Entrando…' : 'Entrar no Evolyn'}
        </button>

        {submitError && (
          <GameAlertBanner
            id="login-submit-error"
            variant="error"
            title="Não foi possível entrar"
            message={submitError}
            live
          />
        )}
      </form>

      <p className="auth-sheet__switch">
        Ainda não tem conta?{' '}
        <button type="button" className="auth-sheet__text-btn" onClick={onGoRegister}>
          Começar agora
        </button>
      </p>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </>
  );
}
