import type { InputHTMLAttributes } from 'react';

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
  hint?: string;
}

export function AuthField({ label, error, hint, id, ...inputProps }: AuthFieldProps) {
  const fieldId = id ?? inputProps.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={`game-auth-field${error ? ' game-auth-field--invalid' : ''}`}>
      <label htmlFor={fieldId} className="game-auth-field__label">
        {label}
      </label>
      <input
        {...inputProps}
        id={fieldId}
        className="game-input game-auth-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
      />
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
