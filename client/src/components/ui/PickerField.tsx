import type { InputHTMLAttributes, ReactNode } from 'react';

interface PickerFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type: 'time' | 'date';
  label: string;
  emptyLabel: string;
  display?: string;
  hint?: string;
  icon?: ReactNode;
}

function formatDisplay(type: 'time' | 'date', value: string): string {
  if (!value) return '';
  if (type === 'time') return value;
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

/** Campo de data/hora com rótulo visível — não depende do placeholder nativo. */
export function PickerField({
  type,
  label,
  emptyLabel,
  display,
  hint,
  icon,
  value,
  ...inputProps
}: PickerFieldProps) {
  const raw = typeof value === 'string' ? value : '';
  const shown = display ?? formatDisplay(type, raw);
  return (
    <label className="picker-field">
      <span className="picker-field__label">{label}</span>
      <span className={`picker-field__trigger${raw ? ' is-filled' : ''}`}>
        {icon}
        <span>{shown || emptyLabel}</span>
        <input type={type} value={raw} className="picker-field__native" {...inputProps} />
      </span>
      {hint ? <small className="picker-field__hint">{hint}</small> : null}
    </label>
  );
}
