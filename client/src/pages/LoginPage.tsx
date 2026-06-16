import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { GameAuthPanel, GameAuthScene } from '@/components/auth/GameAuthScene';
import { getHealth } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { getSavedEmail, isRememberMeEnabled } from '@/lib/auth-storage';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = getSavedEmail();
    if (saved) setEmail(saved);
    setRememberMe(isRememberMeEnabled());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/onboarding');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGuestLoading(false);
    }
  };

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
        {apiOnline === false && (
          <p className="game-login__error game-login__error--warn">
            API offline. Rode <strong>npm run dev</strong> na pasta do projeto e abra{' '}
            <strong>http://localhost:5173</strong>.
          </p>
        )}
        {apiOnline === true && dbOnline === false && (
          <p className="game-login__error game-login__error--warn">
            API online, mas o MongoDB está desconectado. Confira <strong>server/.env</strong> e o IP
            liberado no Atlas.
          </p>
        )}

        <form onSubmit={handleSubmit} className="game-login__form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="EMAIL"
            autoComplete="email"
            required
            className="game-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="SENHA"
            autoComplete="current-password"
            required
            className="game-input"
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

          {error && <p className="game-login__error">{error}</p>}

          <button type="submit" disabled={loading || guestLoading} className="game-btn game-btn--primary">
            {loading ? '...' : 'JOGAR'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGuest}
          disabled={loading || guestLoading}
          className="game-btn game-btn--secondary game-auth-guest"
        >
          {guestLoading ? '...' : 'VISITANTE'}
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
