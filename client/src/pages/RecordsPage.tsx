import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Trophy } from 'lucide-react';
import { computePersonalRecords } from '@shared/personal-records';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { GameButton } from '@/components/ui/GameButton';
import { useApp } from '@/hooks/useApp';

const NOVO_RECORDE_DIAS = 7;

function formatRecordDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RecordsPage() {
  const navigate = useNavigate();
  const { history, ensureHistory, historyLoading } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    void ensureHistory();
  }, [ensureHistory]);

  const records = useMemo(() => {
    const map = computePersonalRecords(history);
    return [...map.values()].sort(
      (a, b) => new Date(b.concluido_em).getTime() - new Date(a.concluido_em).getTime(),
    );
  }, [history]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((r) => r.nome.toLowerCase().includes(needle));
  }, [query, records]);

  const [openedAt] = useState(() => Date.now());
  const novoLimite = openedAt - NOVO_RECORDE_DIAS * 24 * 60 * 60 * 1000;

  if (historyLoading && records.length === 0) return <PageLoader />;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <GamePageHeader
        eyebrow="Evolução"
        title="Recordes"
        onBack={() => navigate(-1)}
        backIcon="x"
        backAlign="right"
      />

      <p className="text-sm font-semibold text-stone-500">
        Melhor volume por exercício — série × reps ou série × tempo.
      </p>

      {records.length > 0 && (
        <label className="records-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar exercício"
            aria-label="Buscar recordes por exercício"
          />
        </label>
      )}

      {records.length === 0 && (
        <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
          <Trophy size={28} className="text-amber-500" aria-hidden />
          <p className="text-sm font-bold text-stone-600">Nenhum recorde ainda.</p>
          <p className="text-xs font-semibold text-stone-500">
            Complete treinos para começar a registrar seus melhores volumes.
          </p>
          <GameButton onClick={() => navigate('/treino')}>Ir ao Treino</GameButton>
        </div>
      )}

      {records.length > 0 && filtered.length === 0 && (
        <p className="text-sm font-bold text-stone-500">Nenhum exercício com esse nome.</p>
      )}

      <ul className="flex flex-col gap-2">
        {filtered.map((r) => {
          const recente = new Date(r.concluido_em).getTime() >= novoLimite;
          return (
            <li key={r.slug} className="glass-card flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-stone-800">{r.nome}</p>
                <p className="text-[0.68rem] font-semibold text-stone-500">
                  {formatRecordDate(r.concluido_em)}
                  {recente ? ' · Novo' : ''}
                </p>
              </div>
              <strong className="shrink-0 text-sm font-black text-emerald-700">
                {r.melhor_valor}
                {r.unidade === 'segundos' ? 's' : ' reps'}
              </strong>
            </li>
          );
        })}
      </ul>

      <Link to="/perfil" className="game-link-btn self-start">
        ← Voltar ao perfil
      </Link>
    </div>
  );
}
