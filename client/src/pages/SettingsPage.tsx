import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Dumbbell,
  HelpCircle,
  LogOut,
  PlayCircle,
  Sparkles,
  ScrollText,
  UserRound,
  Volume2,
  Zap,
} from 'lucide-react';
import { showGameToast } from '@/components/ui/GameToast';
import { Modal } from '@/components/ui/Modal';
import { TermsModal } from '@/components/legal/TermsModal';
import { TrainingProfileModal } from '@/components/onboarding/TrainingProfileModal';
import { AboutSection } from '@/components/settings/AboutSection';
import { GiftCodeSection } from '@/components/settings/GiftCodeSection';
import { SoundPackSection } from '@/components/settings/SoundPackSection';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/lib/api';
import { setSoundSettings } from '@/lib/sounds';
import { markTutorialSeen } from '@/lib/tutorial';
import type { TreinoBase } from '@/types';
import {
  ATIVIDADE_COINS_EXTRA,
  ATIVIDADE_XP_POR_UNIDADE,
  ATIVIDADES_MIN_DESCANSO,
} from '@shared/atividades';
import {
  MOEDA_XP_STEP,
  CICLO_HINTS,
  CICLO_LABELS,
  ESCOPO_LABELS,
  FOCO_LABELS,
  CURRENCY_NAME,
  formatFrozenStreakDescription,
  FROZEN_STREAK_LABEL,
  normalizeCicloTreinos,
  XP_ACHIEVEMENT_BONUS,
  XP_DAILY_CAP_BASE,
  XP_DAILY_CAP_PER_ACHIEVEMENT,
  XP_DAILY_CAP_PER_BESTIARY,
  XP_DAILY_CAP_PER_LEVEL,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  XP_STREAK_BONUS_MAX,
  XP_STREAK_BONUS_PER_DAY,
} from '@/types';

const CICLOS: TreinoBase[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTerms, setShowTerms] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showTrainingProfile, setShowTrainingProfile] = useState(false);
  const [showXpRules, setShowXpRules] = useState(() => location.hash === '#regras-xp');

  // Deep link "Ver regras de XP": expande o dropdown e rola até ele.
  useEffect(() => {
    if (location.hash !== '#regras-xp') return;
    setShowXpRules(true);
    const timer = window.setTimeout(() => {
      document.getElementById('regras-xp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [location.hash]);
  const [som, setSom] = useState(user?.preferencias?.som_habilitado ?? true);
  const [volume, setVolume] = useState(user?.preferencias?.sfx_volume ?? 0.7);
  const [confetti, setConfetti] = useState(
    user?.preferencias?.confetti_animacoes_habilitadas ?? true,
  );
  const [descanso, setDescanso] = useState(user?.preferencias?.descanso_padrao_seg ?? 30);
  const [ciclo, setCiclo] = useState<TreinoBase[]>(
    normalizeCicloTreinos(user?.preferencias?.ciclo_treinos),
  );
  const [saving, setSaving] = useState(false);

  // Barra de salvar só aparece quando algo realmente mudou em relação ao salvo.
  const dirty = useMemo(() => {
    if (!user) return false;
    const prefs = user.preferencias;
    return (
      som !== (prefs?.som_habilitado ?? true) ||
      volume !== (prefs?.sfx_volume ?? 0.7) ||
      confetti !== (prefs?.confetti_animacoes_habilitadas ?? true) ||
      descanso !== (prefs?.descanso_padrao_seg ?? 30) ||
      normalizeCicloTreinos(ciclo).join('') !==
        normalizeCicloTreinos(prefs?.ciclo_treinos).join('')
    );
  }, [user, som, volume, confetti, descanso, ciclo]);

  const discard = () => {
    setSom(user?.preferencias?.som_habilitado ?? true);
    setVolume(user?.preferencias?.sfx_volume ?? 0.7);
    setConfetti(user?.preferencias?.confetti_animacoes_habilitadas ?? true);
    setDescanso(user?.preferencias?.descanso_padrao_seg ?? 30);
    setCiclo(normalizeCicloTreinos(user?.preferencias?.ciclo_treinos));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateMe({
        preferencias: {
          ...user!.preferencias,
          som_habilitado: som,
          sfx_volume: volume,
          confetti_animacoes_habilitadas: confetti,
          descanso_padrao_seg: descanso,
          ciclo_treinos: normalizeCicloTreinos(ciclo),
        },
      });
      setSoundSettings(som, volume);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const requestNotifications = () => {
    if ('Notification' in window) {
      void Notification.requestPermission();
    }
  };

  const toggleCiclo = (c: TreinoBase) => {
    setCiclo((prev) => {
      if (prev.includes(c)) {
        if (prev.length <= 2) return prev;
        return prev.filter((x) => x !== c);
      }
      return normalizeCicloTreinos([...prev, c]);
    });
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    if (user) {
      void markTutorialSeen(user).then(() => refreshUser());
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-20">
      <GamePageHeader eyebrow="Sistema" title="Opções" />

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <UserRound size={14} /> Conta
        </h3>
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-sm font-extrabold text-stone-800">
            {user?.nome}
          </span>
          <span className="settings-user-tag tabular-nums">#{user?.tag ?? '----'}</span>
          <button
            type="button"
            className="settings-tag-copy"
            aria-label="Copiar sua tag"
            title="Copiar tag"
            onClick={() => {
              void navigator.clipboard.writeText(`${user?.nome ?? ''} #${user?.tag ?? ''}`.trim());
              showGameToast('Tag copiada!', { variant: 'success' });
            }}
          >
            <Copy size={13} aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs font-medium text-stone-500">
          Sua tag identifica você mesmo que existam outros jogadores com o mesmo nome.
        </p>
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-2 flex items-center gap-2">
          <ClipboardList size={14} /> Meu plano de treino
        </h3>
        <p className="text-xs font-medium text-stone-500">
          {user?.perfil_treino
            ? `${ESCOPO_LABELS[user.perfil_treino.escopo]} · ${FOCO_LABELS[user.perfil_treino.foco]} · ${user.perfil_treino.frequencia_semanal}x por semana`
            : 'Responda o questionário de treino e receba missões montadas pro seu objetivo.'}
        </p>
        <GameButton
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => setShowTrainingProfile(true)}
        >
          {user?.perfil_treino ? 'Ajustar plano de treino' : 'Montar meu plano'}
        </GameButton>
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <Dumbbell size={14} /> Treino
        </h3>
        <label className="block text-sm font-bold">
          Descanso entre séries: {descanso}s
          <input
            type="range"
            min={10}
            max={90}
            value={descanso}
            onChange={(e) => setDescanso(Number(e.target.value))}
            className="mt-2 w-full cursor-pointer"
          />
        </label>

        <p className="mt-5 text-sm font-bold">Focos do treino</p>
        <p className="mt-1 mb-3 text-xs font-medium text-stone-500">
          Os treinos sugeridos alternam entre os focos ativos (mínimo 2).
        </p>
        <div className="flex flex-col gap-2">
          {CICLOS.map((c) => {
            const active = ciclo.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCiclo(c)}
                aria-pressed={active}
                className={`settings-cycle${active ? ' settings-cycle--on' : ''}`}
              >
                <span className="settings-cycle__badge" aria-hidden>
                  {c}
                </span>
                <span className="settings-cycle__text">
                  <strong>{CICLO_LABELS[c]}</strong>
                  <small>{CICLO_HINTS[c]}</small>
                </span>
                {active && <Check size={16} className="settings-cycle__check" aria-hidden />}
              </button>
            );
          })}
        </div>
      </section>


      <section className="glass-card p-4">
        <h3 className="game-section-title mb-4 flex items-center gap-2">
          <Volume2 size={14} /> Áudio
        </h3>
        <label className="flex cursor-pointer items-center gap-3 font-semibold">
          <input
            type="checkbox"
            checked={som}
            onChange={(e) => setSom(e.target.checked)}
            className="cursor-pointer"
          />
          Sons habilitados
        </label>
        <label className="mt-4 block text-sm font-bold">
          Volume: {Math.round(volume * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="mt-2 w-full cursor-pointer"
          />
        </label>
        <SoundPackSection />
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <Sparkles size={14} /> Celebrações
        </h3>
        <GameButton
          type="button"
          variant={confetti ? 'secondary' : 'ghost'}
          className="flex w-full items-center justify-between gap-3"
          onClick={() => setConfetti((value) => !value)}
          aria-pressed={!confetti}
        >
          <span className="flex items-center gap-2 text-left">
            <Sparkles size={16} aria-hidden />
            {confetti ? 'Desativar animações de confete' : 'Ativar animações de confete'}
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wide text-stone-500">
            {confetti ? 'Ligadas' : 'Desligadas'}
          </span>
        </GameButton>
        <p className="mt-2 text-xs font-medium text-stone-500">
          Isso afeta missões, vitórias e recompensas. O restante das animações continua ativo.
        </p>
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <Bell size={14} /> Notificações
        </h3>
        <p className="mb-3 text-xs font-medium text-stone-500">
          Lembretes de treino e avisos do jogo, direto no navegador.
        </p>
        <GameButton variant="secondary" className="w-full" onClick={requestNotifications}>
          Permitir notificações
        </GameButton>
      </section>

      <section className="glass-card overflow-hidden">
        <button
          type="button"
          className="settings-collapse__toggle"
          aria-expanded={showXpRules}
          onClick={() => setShowXpRules((v) => !v)}
        >
          <h3 className="game-section-title mb-0 flex items-center gap-2">
            <Zap size={14} /> Regras de XP
          </h3>
          <ChevronDown
            size={18}
            className={`settings-collapse__chevron${showXpRules ? ' settings-collapse__chevron--open' : ''}`}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {showXpRules && (
            <motion.div
              id="regras-xp"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="game-xp-rules px-4 pb-4 text-sm font-medium leading-relaxed text-stone-600">
                <p className="mb-2 font-bold text-stone-700">Treino diário</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    <strong>{XP_DAILY_PER_EXERCISE} XP</strong> por exercício concluído (treino com
                    mínimo de <strong>{XP_DAILY_MIN_EXERCISES}</strong> exercícios).
                  </li>
                  <li>
                    Máx. diário unificado: <strong>{XP_DAILY_CAP_BASE}</strong> base +{' '}
                    <strong>{XP_DAILY_CAP_PER_LEVEL}</strong> por nível +{' '}
                    <strong>{XP_DAILY_CAP_PER_BESTIARY}</strong> por inimigo descoberto no Bestiário
                    + <strong>{XP_DAILY_CAP_PER_ACHIEVEMENT}</strong> por conquista desbloqueada.
                  </li>
                  <li>
                    Exercícios, streak e conquistas do treino contam no mesmo máx. diário. EXP
                    Instantâneo, AFK e códigos presente vão direto ao total.
                  </li>
                  <li>Após atingir o máx., o restante do dia não rende mais XP de treino.</li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">Bônus de treino</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    Streak: até <strong>+{XP_STREAK_BONUS_MAX} XP</strong> (+
                    {XP_STREAK_BONUS_PER_DAY} por dia de sequência).
                  </li>
                  <li>
                    Conquistas novas: <strong>+{XP_ACHIEVEMENT_BONUS} XP</strong> cada.
                  </li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">Atividades</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    <strong>+{ATIVIDADE_XP_POR_UNIDADE} XP</strong> por atividade concluída, em
                    qualquer dia — treino ou descanso.
                  </li>
                  <li>
                    Vale pras primeiras <strong>{ATIVIDADES_MIN_DESCANSO}</strong> atividades do dia.
                    Da próxima em diante, cada atividade extra dá{' '}
                    <strong>+{ATIVIDADE_COINS_EXTRA} {CURRENCY_NAME}</strong> em vez de XP.
                  </li>
                  <li>
                    Sequência (streak): em dia de descanso, atividades mantêm a sequência a partir da{' '}
                    {ATIVIDADES_MIN_DESCANSO}ª concluída no dia. Em dia de treino, a sequência vem só
                    do treino.
                  </li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">{FROZEN_STREAK_LABEL}</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>{formatFrozenStreakDescription()}</li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">{CURRENCY_NAME}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong>1 {CURRENCY_NAME}</strong> a cada <strong>{MOEDA_XP_STEP} XP</strong>{' '}
                    totais ganhos (conversão automática).
                  </li>
                  <li>Atividades extras do dia também dão {CURRENCY_NAME} diretamente (ver acima).</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <GiftCodeSection />

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <HelpCircle size={14} /> Ajuda
        </h3>
        <div className="flex flex-col gap-2">
          <GameButton
            variant="secondary"
            className="flex w-full items-center justify-center gap-2"
            onClick={() => setShowTutorial(true)}
          >
            <PlayCircle size={16} aria-hidden /> Ver o tutorial novamente
          </GameButton>
          <GameButton
            variant="ghost"
            className="flex w-full items-center justify-center gap-2"
            onClick={() => setShowTerms(true)}
          >
            <ScrollText size={16} aria-hidden /> Termos e condições
          </GameButton>
        </div>
      </section>

      <AboutSection />

      <GameButton
        variant="secondary"
        onClick={() => setConfirmLogout(true)}
        className="flex items-center justify-center gap-2 text-red-600"
      >
        <LogOut size={18} /> Sair da conta
      </GameButton>

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        labelledBy="logout-confirm-title"
      >
        <h2 id="logout-confirm-title" className="text-base font-extrabold text-stone-800">
          Sair da conta?
        </h2>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Você vai precisar entrar de novo para continuar sua jornada.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GameButton
            variant="ghost"
            className="!w-auto px-4"
            onClick={() => setConfirmLogout(false)}
          >
            Cancelar
          </GameButton>
          <GameButton
            variant="danger"
            className="!w-auto px-5"
            onClick={() => void handleLogout()}
          >
            Sair
          </GameButton>
        </div>
      </Modal>

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="settings-savebar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <span className="settings-savebar__label">Alterações não salvas</span>
            <div className="settings-savebar__actions">
              <GameButton variant="ghost" className="!w-auto px-3" onClick={discard}>
                Descartar
              </GameButton>
              <GameButton className="!w-auto px-5" disabled={saving} onClick={() => void save()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </GameButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      <TutorialOverlay open={showTutorial} onClose={handleTutorialClose} />
      <TrainingProfileModal
        open={showTrainingProfile}
        onClose={() => setShowTrainingProfile(false)}
      />
    </div>
  );
}
