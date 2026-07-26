import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ListChecks, Medal, ScrollText, Search, Timer, Zap } from 'lucide-react';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/PageLoader';
import { ShareCardTrigger } from '@/components/share/ShareCardTrigger';
import { getWorkoutHistoryFeed, getWorkoutHistorySessionDetail } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import { formatTrainingDuration } from '@/lib/utils';
import type {
  IWorkoutHistoryDocument,
  WorkoutHistoryFeedCursor,
  WorkoutHistorySessionDetail,
} from '@/types';

type TypeFilter = 'todos' | 'treinos' | 'atividades';
type PeriodFilter = 'todos' | 'semana' | 'mes';

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'treinos', label: 'Treinos' },
  { id: 'atividades', label: 'Atividades' },
];

const PERIOD_FILTERS: { id: PeriodFilter; label: string }[] = [
  { id: 'todos', label: 'Sempre' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mês' },
];

function formatSessionDate(concluidoEm: string | Date): string {
  const d = new Date(concluidoEm);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function HistoricoPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IWorkoutHistoryDocument[]>([]);
  const [nextCursor, setNextCursor] = useState<WorkoutHistoryFeedCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkoutHistorySessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await getWorkoutHistoryFeed();
        if (cancelled) return;
        setSessions(page.items);
        setNextCursor(page.next_cursor);
      } catch (err) {
        showGameToast(getErrorMessage(err, 'Não foi possível carregar o histórico.'), {
          variant: 'error',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getWorkoutHistoryFeed({ cursor: nextCursor });
      setSessions((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar mais treinos.'), {
        variant: 'error',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const openSession = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const result = await getWorkoutHistorySessionDetail(id);
      setDetail(result);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar essa sessão.'), {
        variant: 'error',
      });
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const now = new Date().getTime();
  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const isAtividade = Boolean(session.atividade);
      if (typeFilter === 'treinos' && isAtividade) return false;
      if (typeFilter === 'atividades' && !isAtividade) return false;

      if (periodFilter !== 'todos') {
        const diffDays = (now - new Date(session.concluido_em).getTime()) / 86_400_000;
        if (periodFilter === 'semana' && diffDays > 7) return false;
        if (periodFilter === 'mes' && diffDays > 31) return false;
      }

      if (q) {
        const matchesNome = session.treino_nome.toLowerCase().includes(q);
        const matchesExercicio = session.exercicios.some((ex) =>
          ex.nome.toLowerCase().includes(q),
        );
        if (!matchesNome && !matchesExercicio) return false;
      }

      return true;
    });
  }, [sessions, query, typeFilter, periodFilter, now]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader
        eyebrow="Diário de bordo"
        title="Treinos e Atividades"
        onBack={() => navigate(-1)}
        backIcon="x"
        backAlign="right"
      />

      {sessions.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <label className="library-search">
            <Search size={16} className="library-search__icon" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por treino ou exercício..."
              className="library-search__input"
              aria-label="Buscar no histórico"
            />
          </label>

          <div className="flex gap-1.5" role="group" aria-label="Tipo">
            {TYPE_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`game-tab${typeFilter === id ? ' game-tab--active' : ''}`}
                onClick={() => setTypeFilter(id)}
              >
                {id === 'treinos' && <Dumbbell size={12} className="mr-1 inline" aria-hidden />}
                {id === 'atividades' && <ListChecks size={12} className="mr-1 inline" aria-hidden />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5" role="group" aria-label="Período">
            {PERIOD_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`game-tab${periodFilter === id ? ' game-tab--active' : ''}`}
                onClick={() => setPeriodFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="glass-card p-4 text-center text-sm font-bold text-stone-500">
          Nenhum treino registrado ainda. Complete uma missão pra abrir o primeiro capítulo.
        </div>
      )}

      {sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="glass-card p-4 text-center text-sm font-bold text-stone-500">
          Nada encontrado nos treinos carregados.
          {nextCursor && ' Carregue mais treinos abaixo para buscar mais pra trás.'}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {filteredSessions.map((session) => (
          <li key={session.id}>
            <button
              type="button"
              onClick={() => void openSession(session.id)}
              className="glass-card flex w-full items-center justify-between gap-3 p-3.5 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-stone-800">
                  {session.treino_nome}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-stone-500">
                  <span>{formatSessionDate(session.concluido_em)}</span>
                  <span aria-hidden>·</span>
                  <Timer size={12} aria-hidden />
                  {formatTrainingDuration(session.duracao_total_segundos)}
                </p>
              </div>
              {(session.xp_ganho ?? 0) > 0 && (
                <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                  <Zap size={12} aria-hidden /> +{session.xp_ganho} XP
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {nextCursor && (
        <GameButton variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? 'Carregando...' : 'Carregar mais treinos'}
        </GameButton>
      )}

      <Modal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        variant="wide"
        labelledBy="historico-detail-title"
      >
        {detailLoading || !detail ? (
          <p className="p-2 text-sm font-bold text-stone-500">Carregando sessão...</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <h2
                id="historico-detail-title"
                className="flex items-center gap-1.5 text-base font-extrabold text-stone-800"
              >
                <ScrollText size={18} aria-hidden /> {detail.session.treino_nome}
              </h2>
              <p className="mt-1 text-xs font-bold text-stone-500">
                {formatSessionDate(detail.session.concluido_em)} ·{' '}
                {formatTrainingDuration(detail.session.duracao_total_segundos)}
                {(detail.session.xp_ganho ?? 0) > 0 && ` · +${detail.session.xp_ganho} XP`}
              </p>
            </div>

            {detail.personal_records_hit.length > 0 && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                  <Medal size={14} aria-hidden /> Recordes batidos nesta sessão
                </p>
                <ul className="space-y-2">
                  {detail.personal_records_hit.map((pr) => (
                    <li
                      key={pr.slug}
                      className="flex items-center justify-between gap-2 text-xs font-bold text-amber-800"
                    >
                      <span>
                        {pr.nome}: {pr.valor_anterior} → {pr.valor_novo}{' '}
                        {pr.unidade === 'segundos' ? 's' : 'reps'}
                      </span>
                      <ShareCardTrigger
                        variant="ghost"
                        label=""
                        className="shrink-0 !px-2 !py-1"
                        data={{
                          kind: 'record',
                          exerciseName: pr.nome,
                          previousValue: pr.valor_anterior,
                          newValue: pr.valor_novo,
                          unidade: pr.unidade,
                          dateLabel: formatSessionDate(detail.session.concluido_em),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="flex flex-col gap-1.5">
              {detail.session.exercicios.map((ex, i) => (
                <li
                  key={`${ex.slug}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2"
                >
                  <span className="truncate text-sm font-bold text-stone-700">{ex.nome}</span>
                  <span className="shrink-0 text-xs font-extrabold text-stone-500">
                    {ex.modo === 'tempo'
                      ? `${ex.series ?? 1}x ${ex.duracao_segundos}s`
                      : `${ex.series ?? 1}x ${ex.repeticoes_realizadas ?? 0} reps`}
                  </span>
                </li>
              ))}
            </ul>

            {(detail.session.xp_ganho ?? 0) > 0 && (
              <ShareCardTrigger
                className="w-full"
                label="Compartilhar treino"
                data={{
                  kind: 'workout',
                  workoutName: detail.session.treino_nome,
                  dateLabel: formatSessionDate(detail.session.concluido_em),
                  xpGained: detail.session.xp_ganho ?? 0,
                }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
