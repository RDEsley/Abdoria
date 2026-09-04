import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

type SettingsRowProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  softDestructive?: boolean;
  disabled?: boolean;
  className?: string;
  role?: string;
  'aria-expanded'?: boolean;
};

export function SettingsRow({
  icon,
  title,
  description,
  trailing,
  chevron,
  onClick,
  href,
  destructive,
  softDestructive,
  disabled,
  className,
  role,
  'aria-expanded': ariaExpanded,
}: SettingsRowProps) {
  const interactive = Boolean(onClick || href) && !disabled;
  const tone = destructive ? ' is-destructive' : softDestructive ? ' is-soft-destructive' : '';
  const classes = `settings-row${interactive ? ' is-interactive' : ''}${tone}${
    className ? ` ${className}` : ''
  }`;

  const main = (
    <>
      {icon ? (
        <span className="settings-row__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="settings-row__text">
        <strong className="settings-row__title">{title}</strong>
        {description ? <span className="settings-row__desc">{description}</span> : null}
      </span>
    </>
  );

  const end = (
    <>
      {trailing ? <span className="settings-row__trailing">{trailing}</span> : null}
      {chevron ? (
        <ChevronRight className="settings-row__chevron" size={16} aria-hidden />
      ) : null}
    </>
  );

  if (href) {
    return (
      <a className={classes} href={href} target="_blank" rel="noreferrer">
        {main}
        {end}
      </a>
    );
  }

  if (onClick && trailing) {
    return (
      <div className={classes}>
        <button
          type="button"
          className="settings-row__main"
          onClick={onClick}
          disabled={disabled}
          role={role}
          aria-expanded={ariaExpanded}
        >
          {main}
          {chevron ? (
            <ChevronRight className="settings-row__chevron" size={16} aria-hidden />
          ) : null}
        </button>
        <span className="settings-row__trailing">{trailing}</span>
      </div>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        role={role}
        aria-expanded={ariaExpanded}
      >
        {main}
        {end}
      </button>
    );
  }

  return (
    <div className={classes} role={role}>
      {main}
      {end}
    </div>
  );
}

export function SettingsSwitch({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <label
      className={`settings-switch${disabled ? ' is-disabled' : ''}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden />
    </label>
  );
}
