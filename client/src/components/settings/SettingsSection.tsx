import type { ReactNode } from 'react';

export function SettingsSection({
  label,
  children,
  className,
  id,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={`settings-group${className ? ` ${className}` : ''}`} id={id}>
      {label ? <p className="settings-group__label">{label}</p> : null}
      <section className="settings-surface">{children}</section>
    </div>
  );
}
