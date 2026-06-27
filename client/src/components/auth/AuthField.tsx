import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label: string;
  error?: string;
  hint?: string;
  /** Destaca o campo sem mensagem própria (ex.: credenciais inválidas no login). */
  highlight?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  showPasswordToggle?: boolean;
}

export function AuthField({
  label,
  error,
  hint,
  highlight = false,
  id,
  type = 'text',
  showPasswordToggle = false,
  ...inputProps
}: AuthFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const fieldId = id ?? inputProps.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const isInvalid = Boolean(error) || highlight;
  const isPassword = type === 'password';
  const inputType = isPassword && showPasswordToggle && passwordVisible ? 'text' : type;

  return (
    <div className={`game-auth-field${isInvalid ? ' game-auth-field--invalid' : ''}`}>
      <label htmlFor={fieldId} className="game-auth-field__label">
        {label}
      </label>
      <div className={isPassword && showPasswordToggle ? 'game-auth-field__password' : undefined}>
        <input
          {...inputProps}
          id={fieldId}
          type={inputType}
          className="game-input game-auth-field__input"
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={[hintId, errorId, inputProps['aria-describedby']].filter(Boolean).join(' ') || undefined}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            className="game-auth-field__password-toggle"
            onClick={() => setPasswordVisible((v) => !v)}
            aria-pressed={passwordVisible}
            aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            tabIndex={-1}
          >
            {passwordVisible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="game-auth-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="game-auth-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
