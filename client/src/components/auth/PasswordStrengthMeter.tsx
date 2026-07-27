interface Strength {
  score: number;
  label: string;
  tone: 'weak' | 'fair' | 'good' | 'strong';
}

/** 4 critérios simples e visíveis pro usuário entender o que falta: 8+
    caracteres, maiúsculas + minúsculas, número, símbolo. */
function evaluatePassword(value: string): Strength {
  const checks = [
    value.length >= 8,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^a-zA-Z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  if (score <= 1) return { score, label: 'Fraca', tone: 'weak' };
  if (score === 2) return { score, label: 'Razoável', tone: 'fair' };
  if (score === 3) return { score, label: 'Boa', tone: 'good' };
  return { score, label: 'Forte', tone: 'strong' };
}

/** Medidor de força da senha, estilo forms profissionais — atualiza a cada
    tecla, some quando o campo está vazio. */
export function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const { score, label, tone } = evaluatePassword(value);

  return (
    <div className="game-password-strength" aria-live="polite">
      <div className="game-password-strength__track">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`game-password-strength__seg${i < score ? ` game-password-strength__seg--${tone}` : ''}`}
          />
        ))}
      </div>
      <span className={`game-password-strength__label game-password-strength__label--${tone}`}>
        {label}
      </span>
    </div>
  );
}
