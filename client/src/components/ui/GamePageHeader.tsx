interface Props {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}

export function GamePageHeader({ eyebrow, title, children }: Props) {
  return (
    <header className="game-page-header">
      {eyebrow && <p className="game-page-header__eyebrow">{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="game-page-header__title">{title}</h2>
        {children}
      </div>
    </header>
  );
}
