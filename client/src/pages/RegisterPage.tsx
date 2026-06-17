import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { GameAuthPanel, GameAuthScene } from '@/components/auth/GameAuthScene';
import { getErrorMessage } from '@/lib/api-errors';
import {
  validateEmail,
  validatePassword,
  validateRegisterForm,
  validateRegisterNome,
  type AuthFieldErrors,
} from '@/lib/auth-validation';
import { useAuth } from '@/context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const errors = validateRegisterForm(nome, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await register(email, password, nome.trim(), rememberMe);
      navigate('/onboarding');
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GameAuthScene>
      <GameAuthPanel
        title="NOVO JOGADOR"
        className="game-login__panel--register"
        footer={
          <Link to="/login" className="game-login__link">
            Já tem conta?
          </Link>
        }
      >
        <form onSubmit={handleSubmit} className="game-login__form" noValidate>
          <AuthField
            label="Nome no jogo"
            name="nome"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              clearFieldError('nome');
              setSubmitError('');
            }}
            onBlur={() => {
              const err = validateRegisterNome(nome);
              setFieldErrors((prev) => (err ? { ...prev, nome: err } : { ...prev, nome: undefined }));
            }}
            error={fieldErrors.nome}
            placeholder="Como quer ser chamado"
            autoComplete="name"
            maxLength={40}
          />
          <AuthField
            label="Email"
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
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError('password');
              setSubmitError('');
            }}
            onBlur={() => {
              const err = validatePassword(password);
              setFieldErrors((prev) => (err ? { ...prev, password: err } : { ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            hint="Mínimo de 6 caracteres."
            placeholder="Crie uma senha segura"
            autoComplete="new-password"
          />

          <label className="game-check game-check--solo">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Lembrar de mim neste dispositivo
          </label>

          {submitError && (
            <AuthAlert variant="error" title="Não foi possível criar a conta" message={submitError} live />
          )}

          <button type="submit" disabled={loading} className="game-btn game-btn--primary">
            {loading ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
      </GameAuthPanel>
    </GameAuthScene>
  );
}
