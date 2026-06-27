import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { GameAuthPanel, GameAuthScene } from '@/components/auth/GameAuthScene';
import { getHealth } from '@/lib/api';
import { DATABASE_BANNER, getErrorMessage, isLoginCredentialsError, OFFLINE_BANNER } from '@/lib/api-errors';
import { getSavedEmail, getRememberMePreference } from '@/lib/auth-storage';
import { validateEmail, validateLoginForm, validatePassword, type AuthFieldErrors } from '@/lib/auth-validation';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registerState = location.state as { accountCreated?: boolean; email?: string } | null;
  const [email, setEmail] = useState(() => registerState?.email ?? getSavedEmail() ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (registerState?.email) {
      setEmail(registerState.email);
    } else {
      const saved = getSavedEmail();
      if (saved) setEmail(saved);
    }
    setRememberMe(getRememberMePreference());
  }, [registerState?.email]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearSubmitFeedback();

    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setCredentialsInvalid(isLoginCredentialsError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    clearSubmitFeedback();
    setFieldErrors({});
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/onboarding');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setGuestLoading(false);
    }
  };

  const showSystemAlert = apiOnline === false || (apiOnline === true && dbOnline === false);

  return (
    <GameAuthScene>
      <GameAuthPanel
        title="ABDORIA"
        footer={
          <Link to="/register" className="game-login__link">
            Novo jogador?
          </Link>
        }
      >
        {registerState?.accountCreated && (
          <AuthAlert
            variant="success"
            title="Conta criada!"
            message="Faça login com seu email e senha para começar a aventura."
          />
        )}

        {showSystemAlert && (
          <div className="game-auth-alerts">
            {apiOnline === false && (
              <AuthAlert
                variant="warn"
                title="Sem conexão"
                message={OFFLINE_BANNER}
              />
            )}
            {apiOnline === true && dbOnline === false && (
              <AuthAlert
                variant="warn"
                title="Dados indisponíveis"
                message={DATABASE_BANNER}
              />
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="game-login__form" noValidate>
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
              setFieldErrors((prev) => (err ? { ...prev, email: err } : { ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
            placeholder="seu@email.com"
            autoComplete="email"
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
              setFieldErrors((prev) => (err ? { ...prev, password: err } : { ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <div className="game-auth-extras">
            <label className="game-check">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Lembrar de mim
            </label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="game-text-link"
            >
              Esqueci a senha
            </button>
          </div>

          <button type="submit" disabled={loading || guestLoading} className="game-btn game-btn--primary">
            {loading ? 'Entrando…' : 'Jogar'}
          </button>

          {submitError && (
            <AuthAlert
              id="login-submit-error"
              variant="error"
              title="Não foi possível entrar"
              message={submitError}
              live
            />
          )}
        </form>

        <button
          type="button"
          onClick={handleGuest}
          disabled={loading || guestLoading}
          className="game-btn game-btn--secondary game-auth-guest"
        >
          {guestLoading ? 'Carregando…' : 'Visitante'}
        </button>
      </GameAuthPanel>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </GameAuthScene>
  );
}
