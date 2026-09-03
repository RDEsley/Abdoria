import { Link } from 'react-router-dom';
import { CalendarCheck2, Dumbbell, NotebookPen } from 'lucide-react';

export function QuickActions() {
  return (
    <nav className="grid grid-cols-3 gap-2" aria-label="Ações rápidas">
      <Link to="/treino" className="home-quick-action">
        <Dumbbell size={16} />
        Treino
      </Link>
      <Link to="/atividades" className="home-quick-action">
        <CalendarCheck2 size={16} />
        Rotina
      </Link>
      <Link to="/atividades" className="home-quick-action">
        <NotebookPen size={16} />
        Nota
      </Link>
    </nav>
  );
}
