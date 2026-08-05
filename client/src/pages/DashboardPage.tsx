import { lazy, Suspense, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ListChecks, Play, Timer } from 'lucide-react';
import { LevelXpSection } from '@/components/gamification/LevelXpSection';
import { MuscleBarChart } from '@/components/dashboard/MuscleBarChart';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { WeekSummary } from '@/components/dashboard/WeekSummary';
import { WeeklyChronicle } from '@/components/dashboard/WeeklyChronicle';
import { AchievementsPreview } from '@/components/gamification/AchievementCard';
import { RatingPrompt } from '@/components/dashboard/RatingPrompt';
import { SuggestionPrompt } from '@/components/dashboard/SuggestionPrompt';
import { NotificationOptInPrompt } from '@/components/dashboard/NotificationOptInPrompt';
import { StreakRecoveryPrompt } from '@/components/dashboard/StreakRecoveryPrompt';
import { AtividadesCard } from '@/components/dashboard/AtividadesCard';
import { GameButton } from '@/components/ui/GameButton';
import { PageLoader } from '@/components/ui/PageLoader';
import { StatTile } from '@/components/ui/StatTile';
import { formatTrainingDuration } from '@/lib/utils';
import { isRestDay } from '@shared/training-plan';
import { resolveFila } from '@shared/atividades';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { useApp } from '@/hooks/useApp';
import { useCopy } from '@/hooks/useCopy';
import {
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  dailyFullExercisesForCap,
  formatExerciseName,
  xpProgressFromTotal,
} from '@/types';
import { DASHBOARD_LEVEL_XP_SECTION_ID } from '@/lib/dashboard-scroll';

const ActivityCalendar = lazy(() =>
  import('@/components/dashboard/ActivityCalendar').then((m) => ({ default: m.ActivityCalendar })),
);
const CampaignFeed = lazy(() =>
  import('@/components/dashboard/CampaignFeed').then((m) => ({ default: m.CampaignFeed })),
);

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function DashboardPage() {
  const { stats, loading, refresh, loadRecommendations, user } = useApp();
  const navigate = useNavigate();
  const copy = useCopy();

  useEffect(() => {
    if (!loading && stats) {
      void loadRecommendations();
    }
  }, [loading, stats, loadRecommendations]);

  if (loading) {
    return <PageLoader />;
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-bold text-stone-500">
          Não foi possível carregar sua tela inicial.
        </p>
        <GameButton onClick={() => void refresh()}>Tentar novamente</GameButton>
      </div>
    );
  }

  const { level, xpInLevel, xpToNext } = xpProgressFromTotal(stats.nivel_xp);
  const xpParaLevelUp = Math.max(0, xpToNext - xpInLevel);
  const sugerido = stats.treino_sugerido;

  const dailyXpHint = `${XP_DAILY_PER_EXERCISE} XP por exercício · mín. ${XP_DAILY_MIN_EXERCISES} no treino · ${dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios atingem o máx. diário`;
  const playLink = sugerido?.preset_id ? `/construtor?preset=${sugerido.preset_id}` : '/construtor';

  const perfilTreino = user?.perfil_treino ?? null;
  const hoje = new Date().getDay();
  // Streak 0 = primeiro treino (ou recomeço): nunca oferecer descanso — sempre missão normal.
  const diaDescanso =
    !stats.treino_hoje && stats.streak_atual > 0 && isRestDay(perfilTreino, hoje);
  // Uma única Atividade (alongamento e afins) já sustenta a streak, em
  // qualquer dia — não existe mais um "aquecimento" próprio.
  const filaHojeCount = diaDescanso
    ? resolveFila(user?.preferencias, getTodaySaoPaulo()).length
    : 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex flex-col gap-5"
    >
      <StreakRecoveryPrompt />
      <RatingPrompt />
      <SuggestionPrompt />
      {stats.streak_atual < 3 && <NotificationOptInPrompt />}

      <motion.div variants={item}>
        <DashboardHero
          stats={stats}
          level={level}
          xpInLevel={xpInLevel}
          xpToNext={xpToNext}
          xpParaLevelUp={xpParaLevelUp}
        />
      </motion.div>

      <motion.div
        variants={item}
        className={`game-quest-card ${stats.treino_hoje ? 'game-quest-card--done' : ''}`}
      >
        <span className="game-quest-card__badge">
          {stats.treino_hoje
            ? 'Concluída'
            : diaDescanso
              ? 'Dia de descanso'
              : copy('dashboard_quest_badge')}
        </span>
        <p className="game-quest-card__status">
          {stats.treino_hoje
            ? 'Treino de hoje concluído.'
            : diaDescanso
              ? 'Uma Atividade leve — um alongamento, por exemplo — já mantém sua sequência hoje.'
              : stats.proximo_treino}
        </p>
        {diaDescanso && (
          <p className="mt-2 text-[0.68rem] font-semibold text-stone-500">
            {filaHojeCount > 0
              ? `Você já tem ${filaHojeCount} atividade${filaHojeCount === 1 ? '' : 's'} na fila de hoje.`
              : 'Escolha uma Atividade abaixo pra manter sua sequência sem abrir mão do descanso — alongamento é uma ótima pedida.'}
          </p>
        )}
        {!stats.treino_hoje && !diaDescanso && sugerido && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-bold text-stone-600">
              {sugerido.ciclo_id
                ? `Ciclo ${sugerido.ciclo_id}`
                : (sugerido.plano_titulo ?? 'Plano')}{' '}
              · {sugerido.total_exercicios} exercícios
            </p>
            {sugerido.exercicios[0] && (
              <p className="text-xs font-extrabold text-stone-700">
                {formatExerciseName(sugerido.exercicios[0])}
                {sugerido.exercicios.length > 1 && (
                  <>
                    {' '}
                    <Link to={playLink} className="game-link-btn ml-1 text-[0.7rem]">
                      +{sugerido.exercicios.length - 1} · Ver mais
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>
        )}
        {stats.alertas_recomendacao?.map((alerta) => (
          <p
            key={alerta.id}
            className="mt-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-2 py-1.5 text-[0.65rem] font-bold text-amber-900"
          >
            <strong>{alerta.titulo}:</strong> {alerta.mensagem}
          </p>
        ))}
        {!stats.treino_hoje && !diaDescanso && !sugerido && (
          <p className="mt-2 text-xs font-bold text-stone-500">
            Escolha ou monte um treino na aba <strong>Missão</strong>.
          </p>
        )}
        {!stats.treino_hoje && diaDescanso && filaHojeCount > 0 && (
          <GameButton
            className="mt-3 flex w-full items-center justify-center gap-2"
            onClick={() => navigate('/atividades-player')}
          >
            <ListChecks size={14} /> Iniciar {filaHojeCount} atividade
            {filaHojeCount === 1 ? '' : 's'}
          </GameButton>
        )}
        {!stats.treino_hoje && !diaDescanso && (
          <Link to={playLink} className="mt-3 block">
            <GameButton className="flex w-full items-center justify-center gap-2">
              <Play size={14} /> Jogar
            </GameButton>
          </Link>
        )}
      </motion.div>

      <motion.div variants={item}>
        <AtividadesCard />
      </motion.div>

      <motion.div variants={item}>
        <WeekSummary />
      </motion.div>

      <motion.div variants={item}>
        <WeeklyChronicle />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <StatTile
          icon={<Flame className="text-orange-500" size={22} />}
          title="Recorde"
          value={`${stats.streak_maior}d`}
          hint="Dias seguidos treinando"
        />
        <StatTile
          icon={<Timer className="text-sky-600" size={22} />}
          title="Tempo total"
          value={formatTrainingDuration(stats.total_segundos ?? stats.total_minutos * 60)}
          hint="Soma de todos os treinos"
        />
      </motion.div>

      <motion.div variants={item}>
        <LevelXpSection
          id={DASHBOARD_LEVEL_XP_SECTION_ID}
          stats={stats}
          level={level}
          xpInLevel={xpInLevel}
          xpToNext={xpToNext}
          xpParaLevelUp={xpParaLevelUp}
          dailyXpHint={dailyXpHint}
          hideHero
        />
      </motion.div>

      <motion.div variants={item}>
        <AchievementsPreview
          conquistas={stats.conquistas}
          unlockedCount={stats.conquistas.filter((c) => c.desbloqueada).length}
          total={stats.conquistas.length}
        />
      </motion.div>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title">Mapa de campanha</h3>
        <Suspense fallback={null}>
          <CampaignFeed />
        </Suspense>
      </motion.section>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title">Mapa de treinos</h3>
        <Suspense fallback={<PageLoader />}>
          <ActivityCalendar />
        </Suspense>
        <GameButton
          variant="secondary"
          size="sm"
          onClick={() => navigate('/historico')}
          className="mt-3 w-full"
        >
          Ver histórico completo
        </GameButton>
      </motion.section>

      <motion.section variants={item} className="glass-card p-4">
        <h3 className="game-section-title mb-3">Zonas da semana</h3>
        <MuscleBarChart muscles={stats.musculos_semana} />
      </motion.section>
    </motion.div>
  );
}
