import { useEffect, useState } from 'react';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthField } from '@/components/auth/AuthField';
import { requestPasswordReset } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { validateEmail } from '@/lib/auth-validation';

interface Props {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({ open, onClose, initialEmail = '' }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setError(null);
      setMessage(null);
      setEmailError(undefined);
    }
  }, [open, initialEmail]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setMessage(res.message);
    } catch (submitErr) {
      setError(getErrorMessage(submitErr));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="game-modal"
        role="dialog"
        aria-labelledby="forgot-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="forgot-title" className="game-modal__title">
          ESQUECI A SENHA
        </h2>
        <p className="game-modal__text">Informe o email da sua conta. Enviaremos as instruções se ele estiver cadastrado.</p>

        <form onSubmit={handleSubmit} className="game-login__form" noValidate>
          <AuthField
            label="Email"
            name="forgot-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(undefined);
              setError(null);
            }}
            onBlur={() => setEmailError(validateEmail(email))}
            error={emailError}
            placeholder="seu@email.com"
            autoComplete="email"
          />

          {error && <AuthAlert variant="error" title="Não foi possível enviar" message={error} live />}
          {message && <AuthAlert variant="success" title="Verifique seu email" message={message} />}

          <button type="submit" disabled={loading} className="game-btn game-btn--primary">
            {loading ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>

        <button type="button" onClick={onClose} className="game-text-link game-modal__close">
          Voltar
        </button>
      </div>
    </div>
  );
}
