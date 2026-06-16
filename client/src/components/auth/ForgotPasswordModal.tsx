import { useEffect, useState } from 'react';
import { requestPasswordReset } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';

interface Props {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export function ForgotPasswordModal({ open, onClose, initialEmail = '' }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setError(null);
      setMessage(null);
    }
  }, [open, initialEmail]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setMessage(res.message);
    } catch (err) {
      setError(getErrorMessage(err));
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
        <p className="game-modal__text">Informe seu email cadastrado.</p>

        <form onSubmit={handleSubmit} className="game-login__form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="EMAIL"
            required
            className="game-input"
          />

          {error && <p className="game-login__error">{error}</p>}
          {message && <p className="game-modal__success">{message}</p>}

          <button type="submit" disabled={loading} className="game-btn game-btn--primary">
            {loading ? '...' : 'ENVIAR'}
          </button>
        </form>

        <button type="button" onClick={onClose} className="game-text-link game-modal__close">
          Voltar
        </button>
      </div>
    </div>
  );
}
