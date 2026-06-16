import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/api-errors';
import { GameAuthPanel, GameAuthScene } from '@/components/auth/GameAuthScene';
import { useAuth } from '@/context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, nome, rememberMe);
      navigate('/onboarding');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GameAuthScene>
      <GameAuthPanel
        title="NOVO JOGADOR"
        footer={
          <Link to="/login" className="game-login__link">
            Já tem conta?
          </Link>
        }
      >
        <form onSubmit={handleSubmit} className="game-login__form">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="NOME"
            autoComplete="name"
            required
            className="game-input"
          />
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
            placeholder="SENHA (6+)"
            minLength={6}
            autoComplete="new-password"
            required
            className="game-input"
          />

          <label className="game-check game-check--solo">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Lembrar de mim
          </label>

          {error && <p className="game-login__error">{error}</p>}

          <button type="submit" disabled={loading} className="game-btn game-btn--primary">
            {loading ? '...' : 'CRIAR'}
          </button>
        </form>
      </GameAuthPanel>
    </GameAuthScene>
  );
}
